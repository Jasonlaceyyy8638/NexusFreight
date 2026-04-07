import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export type AdminCustomerRow = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string;
  mc_number: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  is_beta_user: boolean;
  trial_type: string | null;
  glance: "paid" | "beta" | "trial" | "expired" | "none";
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

  const { data: profiles, error: pErr } = await svc
    .from("profiles")
    .select(
      "id, full_name, org_id, is_beta_user, trial_type, trial_ends_at, stripe_subscription_id, stripe_customer_id, organizations (name, mc_number)"
    )
    .order("created_at", { ascending: false });

  if (pErr || !profiles) {
    console.error("[admin/customers] profiles:", pErr?.message);
    return NextResponse.json(
      { error: "Could not load profiles." },
      { status: 500 }
    );
  }

  const { data: authData, error: listErr } =
    await svc.auth.admin.listUsers({ perPage: 1000, page: 1 });

  if (listErr) {
    console.error("[admin/customers] listUsers:", listErr.message);
    return NextResponse.json(
      { error: "Could not load auth users." },
      { status: 500 }
    );
  }

  const emailById = new Map<string, string>();
  for (const u of authData.users) {
    if (u.email) emailById.set(u.id, u.email);
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
  const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

  const rows: AdminCustomerRow[] = [];

  for (const raw of profiles as unknown as Array<{
    id: string;
    full_name: string | null;
    org_id: string;
    is_beta_user: boolean | null;
    trial_type: string | null;
    trial_ends_at: string | null;
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
    organizations: { name: string; mc_number: string | null } | null;
  }>) {
    const email = emailById.get(raw.id) ?? "";
    const orgRaw = raw.organizations;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    const companyName = org?.name?.trim() || "—";
    const mc = org?.mc_number?.trim() || null;

    let subStatus: string | null = null;
    let custId = raw.stripe_customer_id?.trim() || null;
    const subId = raw.stripe_subscription_id?.trim() || null;

    if (stripe && subId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        subStatus = sub.status;
        if (!custId && typeof sub.customer === "string") {
          custId = sub.customer;
        }
      } catch {
        subStatus = "unknown";
      }
    }

    const now = Date.now();
    const trialEnd = raw.trial_ends_at
      ? new Date(raw.trial_ends_at).getTime()
      : null;
    const paidActive =
      Boolean(subId && subStatus && ["active", "trialing"].includes(subStatus));

    let glance: AdminCustomerRow["glance"] = "none";
    if (paidActive) glance = "paid";
    else if (raw.is_beta_user) glance = "beta";
    else if (raw.trial_type === "TRIAL" && trialEnd && trialEnd > now)
      glance = "trial";
    else if (trialEnd && trialEnd <= now && !paidActive) glance = "expired";
    else if (raw.trial_type === "BETA" && trialEnd && trialEnd > now)
      glance = "beta";
    else glance = "trial";

    rows.push({
      id: raw.id,
      email,
      full_name: raw.full_name,
      company_name: companyName,
      mc_number: mc,
      stripe_customer_id: custId,
      stripe_subscription_id: subId,
      subscription_status: subStatus,
      trial_ends_at: raw.trial_ends_at,
      is_beta_user: Boolean(raw.is_beta_user),
      trial_type: raw.trial_type,
      glance,
    });
  }

  return NextResponse.json({ customers: rows });
}
