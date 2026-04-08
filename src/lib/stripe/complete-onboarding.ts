import Stripe from "stripe";
import { send7DayTrialWelcomeEmail } from "@/lib/email/send-7day-trial-welcome";
import {
  foundingWelcomeResendConfigured,
  sendFoundingMemberWelcomeEmail,
} from "@/lib/email/send-founding-member-welcome";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

/**
 * Create organization (if needed), attach Stripe subscription/customer, permissions,
 * and welcome email — for a known Supabase user after Checkout.
 */
export async function provisionOrgForProfileFromStripeSession(
  stripe: Stripe,
  userId: string,
  session: Stripe.Checkout.Session
): Promise<{ ok: boolean; error?: string }> {
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return { ok: false, error: "Supabase service role is not configured." };
  }

  if (session.status !== "complete") {
    return { ok: false, error: "Checkout session is not complete." };
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(
      "id, org_id, role, full_name, is_beta_user, trial_type, welcome_email_sent_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, error: "Profile not found." };
  }

  const subRaw = session.subscription;
  const subId =
    typeof subRaw === "string"
      ? subRaw
      : subRaw &&
          typeof subRaw === "object" &&
          "id" in (subRaw as Stripe.Subscription)
        ? String((subRaw as Stripe.Subscription).id)
        : null;

  const customerRaw = session.customer;
  const customerId =
    typeof customerRaw === "string"
      ? customerRaw
      : customerRaw &&
          typeof customerRaw === "object" &&
          "id" in customerRaw
        ? String((customerRaw as { id: string }).id)
        : null;

  let trialEndsAt: string | null = null;
  let subscriptionStatus: string | null = null;
  if (subId) {
    const subObj =
      subRaw && typeof subRaw === "object" && "trial_end" in (subRaw as object)
        ? (subRaw as Stripe.Subscription)
        : await stripe.subscriptions.retrieve(subId);
    subscriptionStatus = subObj.status;
    const te = subObj.trial_end;
    if (typeof te === "number" && te > 0) {
      trialEndsAt = new Date(te * 1000).toISOString();
    }
  }

  const row = profile as {
    org_id: string | null;
    full_name: string | null;
    is_beta_user: boolean | null;
    trial_type: string | null;
    welcome_email_sent_at: string | null;
  };

  if (row.org_id) {
    const patch: Record<string, unknown> = {
      stripe_subscription_id: subId,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    };
    if (subscriptionStatus) {
      patch.stripe_subscription_status = subscriptionStatus;
    }
    if (trialEndsAt) {
      patch.trial_ends_at = trialEndsAt;
    }
    await admin.from("profiles").update(patch).eq("id", userId);
    return { ok: true };
  }

  const { data: userData, error: userErr } =
    await admin.auth.admin.getUserById(userId);
  if (userErr || !userData?.user) {
    return { ok: false, error: "Auth user not found." };
  }

  const meta = (userData.user.user_metadata ?? {}) as Record<
    string,
    unknown
  >;
  const roleType = String(meta.role_type ?? "dispatcher").toLowerCase();

  const emailLocalCarrier = userData.user.email?.split("@")[0] ?? "carrier";
  const carrierCompanyName =
    String(meta.company_name ?? "").trim() || emailLocalCarrier;
  const carrierDot = String(meta.dot_number ?? "").trim();
  const carrierMc = String(meta.mc_number ?? "").trim();
  const activeRaw = meta.is_active_authority;
  const carrierActive =
    activeRaw === "true" || activeRaw === true
      ? true
      : activeRaw === "false" || activeRaw === false
        ? false
        : null;

  const dispatcherAgencyName =
    String(meta.agency_name ?? "").trim() ||
    `${userData.user.email?.split("@")[0] || "Agency"} Dispatch`;

  const { data: pendingRow } = await admin
    .from("pending_signups")
    .select("org_id")
    .eq("stripe_checkout_session_id", session.id)
    .maybeSingle();

  const pendingOrgId = (pendingRow as { org_id?: string | null } | null)
    ?.org_id;

  let newOrgId: string;

  if (pendingOrgId) {
    newOrgId = pendingOrgId;
    if (roleType === "carrier") {
      const { error: upOrgErr } = await admin
        .from("organizations")
        .update({
          name: carrierCompanyName,
          dot_number: carrierDot || null,
          mc_number: carrierMc || null,
          is_active_authority: carrierActive,
        })
        .eq("id", newOrgId);
      if (upOrgErr) {
        return { ok: false, error: upOrgErr.message };
      }
    } else {
      const { error: upOrgErr } = await admin
        .from("organizations")
        .update({ name: dispatcherAgencyName })
        .eq("id", newOrgId);
      if (upOrgErr) {
        return { ok: false, error: upOrgErr.message };
      }
    }

    await admin
      .from("pending_signups")
      .delete()
      .eq("stripe_checkout_session_id", session.id);
  } else if (roleType === "carrier") {
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name: carrierCompanyName,
        type: "Carrier",
        dot_number: carrierDot || null,
        mc_number: carrierMc || null,
        is_active_authority: carrierActive,
      })
      .select("id")
      .single();

    if (orgErr || !org) {
      return {
        ok: false,
        error: orgErr?.message ?? "Could not create carrier organization.",
      };
    }
    newOrgId = org.id as string;
  } else {
    const { data: org, error: orgErr } = await admin
      .from("organizations")
      .insert({
        name: dispatcherAgencyName,
        type: "Agency",
      })
      .select("id")
      .single();

    if (orgErr || !org) {
      return {
        ok: false,
        error: orgErr?.message ?? "Could not create agency organization.",
      };
    }
    newOrgId = org.id as string;
  }

  const patchProfile: Record<string, unknown> = {
    org_id: newOrgId,
    stripe_subscription_id: subId,
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString(),
  };
  if (subscriptionStatus) {
    patchProfile.stripe_subscription_status = subscriptionStatus;
  }
  if (trialEndsAt) {
    patchProfile.trial_ends_at = trialEndsAt;
  }

  const { error: upErr } = await admin
    .from("profiles")
    .update(patchProfile)
    .eq("id", userId);
  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  const { data: existingPerm } = await admin
    .from("user_permissions")
    .select("profile_id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (!existingPerm) {
    const { error: permErr } = await admin.from("user_permissions").insert({
      profile_id: userId,
      org_id: newOrgId,
      can_view_financials: true,
      can_dispatch_loads: true,
      can_edit_fleet: true,
      admin_access: true,
    });
    if (permErr) {
      console.error("[complete-onboarding] user_permissions:", permErr);
    }
  }

  if (!row.welcome_email_sent_at && foundingWelcomeResendConfigured()) {
    const email = userData.user.email?.trim();
    if (email) {
      const displayName =
        (row.full_name && row.full_name.trim()) ||
        String(meta.full_name ?? "").trim() ||
        email.split("@")[0] ||
        "there";

      const sendFounding = row.is_beta_user === true;
      const sendTrial = row.trial_type === "TRIAL";

      try {
        if (sendFounding) {
          await sendFoundingMemberWelcomeEmail({ to: email, displayName });
        } else if (sendTrial) {
          await send7DayTrialWelcomeEmail({ to: email, displayName });
        }

        await admin
          .from("profiles")
          .update({ welcome_email_sent_at: new Date().toISOString() })
          .eq("id", userId)
          .is("welcome_email_sent_at", null);
      } catch (e) {
        console.error("[complete-onboarding] welcome email:", e);
      }
    }
  }

  if (subId) {
    try {
      await stripe.subscriptions.update(subId, {
        metadata: { supabase_user_id: userId },
      });
    } catch (e) {
      console.warn("[complete-onboarding] subscription metadata update:", e);
    }
  }

  return { ok: true };
}

/**
 * After Stripe Checkout completes: create the tenant organization (if needed),
 * attach Stripe IDs, seed permissions, and send the welcome email once.
 * Safe to call from both the webhook and the browser return URL (idempotent).
 */
export async function completeStripeOnboardingFromSession(
  session: Stripe.Checkout.Session,
  stripe: Stripe
): Promise<{ ok: boolean; error?: string }> {
  const userId = session.client_reference_id?.trim();
  if (!userId || session.status !== "complete") {
    return { ok: true };
  }
  return provisionOrgForProfileFromStripeSession(stripe, userId, session);
}
