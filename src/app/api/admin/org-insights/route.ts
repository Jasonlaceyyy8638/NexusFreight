import { NextResponse } from "next/server";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export type AdminDispatcherOrgRow = {
  org_id: string;
  agency_company_name: string;
  primary_name: string | null;
  primary_email: string | null;
  contract_carrier_count: number;
};

export type AdminFleetOrgRow = {
  org_id: string;
  company_name: string;
  mc_number: string | null;
  internal_driver_count: number;
};

export type AdminOrgMetrics = {
  total_independent_carriers: number;
  total_fleet_drivers: number;
  carriers_added_last_30d: number;
  carriers_added_prev_30d: number;
  drivers_added_last_30d: number;
  drivers_added_prev_30d: number;
  /** Which segment has higher relative growth (last 30d vs prev 30d). */
  faster_growing: "independent_carriers" | "fleet_drivers" | "tie" | null;
};

export async function GET() {
  const admin = await getAdminUserOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const svc = createServiceRoleSupabaseClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 503 }
    );
  }

  const now = Date.now();
  const t30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const t60 = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();

  const { data: orgs, error: oErr } = await svc
    .from("organizations")
    .select("id, name, type, mc_number")
    .order("created_at", { ascending: false });

  if (oErr || !orgs) {
    console.error("[admin/org-insights] orgs:", oErr?.message);
    return NextResponse.json(
      { error: "Could not load organizations." },
      { status: 500 }
    );
  }

  const agencyIds = new Set(
    orgs.filter((o) => o.type === "Agency").map((o) => o.id)
  );
  const carrierIds = new Set(
    orgs.filter((o) => o.type === "Carrier").map((o) => o.id)
  );

  const { data: allCarriers, error: cErr } = await svc
    .from("carriers")
    .select("id, org_id, created_at");

  if (cErr || !allCarriers) {
    console.error("[admin/org-insights] carriers:", cErr?.message);
    return NextResponse.json(
      { error: "Could not load carriers." },
      { status: 500 }
    );
  }

  const { data: allDrivers, error: dErr } = await svc
    .from("drivers")
    .select("id, org_id, created_at");

  if (dErr || !allDrivers) {
    console.error("[admin/org-insights] drivers:", dErr?.message);
    return NextResponse.json(
      { error: "Could not load drivers." },
      { status: 500 }
    );
  }

  let profiles: { id: string; org_id: string; full_name: string | null }[] = [];
  if (agencyIds.size > 0) {
    const { data: profRows, error: pErr } = await svc
      .from("profiles")
      .select("id, org_id, full_name, created_at")
      .in("org_id", [...agencyIds])
      .order("created_at", { ascending: true });

    if (pErr || !profRows) {
      console.error("[admin/org-insights] profiles:", pErr?.message);
      return NextResponse.json(
        { error: "Could not load profiles." },
        { status: 500 }
      );
    }
    profiles = profRows as typeof profiles;
  }

  const { data: authData, error: listErr } =
    await svc.auth.admin.listUsers({ perPage: 1000, page: 1 });

  if (listErr) {
    console.error("[admin/org-insights] listUsers:", listErr.message);
    return NextResponse.json(
      { error: "Could not load auth users." },
      { status: 500 }
    );
  }

  const emailById = new Map<string, string>();
  for (const u of authData.users) {
    if (u.email) emailById.set(u.id, u.email);
  }

  const primaryByOrg = new Map<string, { name: string | null; email: string | null }>();
  for (const p of profiles as { id: string; org_id: string; full_name: string | null }[]) {
    if (!primaryByOrg.has(p.org_id)) {
      primaryByOrg.set(p.org_id, {
        name: p.full_name?.trim() || null,
        email: emailById.get(p.id) ?? null,
      });
    }
  }

  const carrierCountByAgency = new Map<string, number>();
  let totalIndependentCarriers = 0;
  let carriersLast30 = 0;
  let carriersPrev30 = 0;

  for (const row of allCarriers as { org_id: string; created_at: string }[]) {
    if (!agencyIds.has(row.org_id)) continue;
    totalIndependentCarriers += 1;
    carrierCountByAgency.set(
      row.org_id,
      (carrierCountByAgency.get(row.org_id) ?? 0) + 1
    );
    const t = new Date(row.created_at).getTime();
    const t30ms = new Date(t30).getTime();
    const t60ms = new Date(t60).getTime();
    if (t >= t30ms) carriersLast30 += 1;
    else if (t >= t60ms && t < t30ms) carriersPrev30 += 1;
  }

  const driverCountByFleet = new Map<string, number>();
  let totalFleetDrivers = 0;
  let driversLast30 = 0;
  let driversPrev30 = 0;

  for (const row of allDrivers as { org_id: string; created_at: string }[]) {
    if (!carrierIds.has(row.org_id)) continue;
    totalFleetDrivers += 1;
    driverCountByFleet.set(
      row.org_id,
      (driverCountByFleet.get(row.org_id) ?? 0) + 1
    );
    const t = new Date(row.created_at).getTime();
    const t30ms = new Date(t30).getTime();
    const t60ms = new Date(t60).getTime();
    if (t >= t30ms) driversLast30 += 1;
    else if (t >= t60ms && t < t30ms) driversPrev30 += 1;
  }

  const score = (last: number, prev: number) =>
    prev <= 0 ? (last > 0 ? 1e9 + last : 0) : (last - prev) / prev;

  const sC = score(carriersLast30, carriersPrev30);
  const sD = score(driversLast30, driversPrev30);

  let faster: AdminOrgMetrics["faster_growing"] = null;
  if (sC === 0 && sD === 0) faster = null;
  else if (Math.abs(sC - sD) < 1e-9) faster = "tie";
  else if (sC > sD) faster = "independent_carriers";
  else faster = "fleet_drivers";

  const dispatchers: AdminDispatcherOrgRow[] = [];
  for (const o of orgs) {
    if (o.type !== "Agency") continue;
    const pr = primaryByOrg.get(o.id);
    dispatchers.push({
      org_id: o.id,
      agency_company_name: o.name,
      primary_name: pr?.name ?? null,
      primary_email: pr?.email ?? null,
      contract_carrier_count: carrierCountByAgency.get(o.id) ?? 0,
    });
  }

  const fleets: AdminFleetOrgRow[] = [];
  for (const o of orgs) {
    if (o.type !== "Carrier") continue;
    fleets.push({
      org_id: o.id,
      company_name: o.name,
      mc_number: o.mc_number?.trim() || null,
      internal_driver_count: driverCountByFleet.get(o.id) ?? 0,
    });
  }

  const metrics: AdminOrgMetrics = {
    total_independent_carriers: totalIndependentCarriers,
    total_fleet_drivers: totalFleetDrivers,
    carriers_added_last_30d: carriersLast30,
    carriers_added_prev_30d: carriersPrev30,
    drivers_added_last_30d: driversLast30,
    drivers_added_prev_30d: driversPrev30,
    faster_growing: faster,
  };

  return NextResponse.json({ metrics, dispatchers, fleets });
}
