import { NextResponse } from "next/server";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export type AdminCompanyOverviewRow = {
  company_id: string;
  carrier_name: string;
  agency_or_fleet_name: string;
  org_type: "Agency" | "Carrier";
  primary_admin_email: string | null;
  membership_staff: number;
  membership_drivers: number;
  drivers_roster_count: number;
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

  const { data: carriers, error: cErr } = await svc
    .from("carriers")
    .select("id, name, org_id")
    .order("created_at", { ascending: false });

  if (cErr || !carriers) {
    return NextResponse.json(
      { error: "Could not load carriers." },
      { status: 500 }
    );
  }

  const orgIds = [...new Set(carriers.map((c) => c.org_id))];
  const orgQuery =
    orgIds.length > 0
      ? await svc.from("organizations").select("id, name, type").in("id", orgIds)
      : { data: [] as { id: string; name: string; type: string }[], error: null };
  if (orgQuery.error) {
    return NextResponse.json(
      { error: "Could not load organizations." },
      { status: 500 }
    );
  }
  const orgRows = orgQuery.data ?? [];

  const orgById = new Map(
    orgRows.map((o) => [o.id, o])
  );

  const { data: memRows, error: mErr } = await svc
    .from("memberships")
    .select("company_id, role");

  if (mErr || !memRows) {
    return NextResponse.json(
      { error: "Could not load memberships." },
      { status: 500 }
    );
  }

  const memByCompany = new Map<
    string,
    { staff: number; drivers: number }
  >();
  for (const m of memRows as { company_id: string; role: string }[]) {
    const cur = memByCompany.get(m.company_id) ?? { staff: 0, drivers: 0 };
    if (m.role === "driver") {
      cur.drivers += 1;
    } else {
      cur.staff += 1;
    }
    memByCompany.set(m.company_id, cur);
  }

  const { data: profileRows } = await svc
    .from("profiles")
    .select("id, org_id, role, created_at")
    .eq("role", "Admin")
    .order("created_at", { ascending: true });

  const firstAdminIdByOrg = new Map<string, string>();
  for (const p of profileRows ?? []) {
    const row = p as { id: string; org_id: string };
    if (!firstAdminIdByOrg.has(row.org_id)) {
      firstAdminIdByOrg.set(row.org_id, row.id);
    }
  }

  const { data: authData, error: listErr } =
    await svc.auth.admin.listUsers({ perPage: 1000, page: 1 });

  if (listErr) {
    return NextResponse.json(
      { error: "Could not load auth users." },
      { status: 500 }
    );
  }

  const emailById = new Map<string, string>();
  for (const u of authData.users) {
    if (u.email) emailById.set(u.id, u.email);
  }

  const { data: driverCounts } = await svc
    .from("drivers")
    .select("carrier_id");

  const driverCountByCarrier = new Map<string, number>();
  for (const d of driverCounts ?? []) {
    const row = d as { carrier_id: string };
    driverCountByCarrier.set(
      row.carrier_id,
      (driverCountByCarrier.get(row.carrier_id) ?? 0) + 1
    );
  }

  const rows: AdminCompanyOverviewRow[] = [];

  for (const raw of carriers) {
    const c = raw as {
      id: string;
      name: string;
      org_id: string;
    };
    const org = orgById.get(c.org_id);
    const mem = memByCompany.get(c.id) ?? { staff: 0, drivers: 0 };
    const adminId = firstAdminIdByOrg.get(c.org_id);
    rows.push({
      company_id: c.id,
      carrier_name: c.name,
      agency_or_fleet_name: org?.name ?? "—",
      org_type: org?.type === "Carrier" ? "Carrier" : "Agency",
      primary_admin_email: adminId ? emailById.get(adminId) ?? null : null,
      membership_staff: mem.staff,
      membership_drivers: mem.drivers,
      drivers_roster_count: driverCountByCarrier.get(c.id) ?? 0,
    });
  }

  return NextResponse.json({ companies: rows });
}
