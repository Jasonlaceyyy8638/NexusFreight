import { sendResendPlainText, resendPlainConfigured } from "@/lib/email/resend-plain";
import { fetchCompanyData } from "@/lib/fmcsa_service";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

type CarrierRow = {
  id: string;
  org_id: string;
  name: string;
  mc_number: string | null;
  dot_number: string | null;
};

const DEFAULT_ALERT_EMAIL = "info@nexusfreight.tech";

export type FmcsaComplianceMonitorResult = {
  ok: boolean;
  checked: number;
  deactivated: number;
  skippedNoIdentifier: number;
  skippedApiError: number;
  errors: string[];
};

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Nightly job: re-verify carriers with `compliance_status = active` (ACTIVE) against FMCSA
 * (`fetchCompanyData` uses docket-number then DOT, same as QCMobile).
 * 3s pause between FMCSA calls to reduce rate-limit risk.
 */
export async function runFmcsaComplianceMonitor(): Promise<FmcsaComplianceMonitorResult> {
  const errors: string[] = [];
  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return {
      ok: false,
      checked: 0,
      deactivated: 0,
      skippedNoIdentifier: 0,
      skippedApiError: 0,
      errors: ["Service role Supabase client not available."],
    };
  }

  const { data: rows, error: selErr } = await admin
    .from("carriers")
    .select("id, org_id, name, mc_number, dot_number")
    .eq("compliance_status", "active");

  if (selErr) {
    return {
      ok: false,
      checked: 0,
      deactivated: 0,
      skippedNoIdentifier: 0,
      skippedApiError: 0,
      errors: [selErr.message],
    };
  }

  const list = (rows ?? []) as CarrierRow[];
  let skippedNoIdentifier = 0;
  let skippedApiError = 0;
  const deactivatedCarriers: {
    name: string;
    mc: string;
    dot: string;
    id: string;
  }[] = [];

  const asOf = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const logText = `Automatically deactivated by Nightly Check on ${asOf} due to FMCSA status change.`;

  let firstFmcsaCall = true;
  for (const row of list) {
    const lookup = (row.mc_number?.trim() || row.dot_number?.trim() || "").trim();
    if (!lookup) {
      skippedNoIdentifier += 1;
      continue;
    }

    if (!firstFmcsaCall) {
      await delayMs(3000);
    }
    firstFmcsaCall = false;

    const result = await fetchCompanyData(lookup);
    if (!result.ok) {
      skippedApiError += 1;
      console.warn(
        `[fmcsa-compliance] skipped ${row.name} (${row.id}): ${result.error}`
      );
      continue;
    }

    const data = result.data;
    const allowed =
      data.allowed_to_operate &&
      data.operating_status_display === "ACTIVE" &&
      data.authority_status === "Active";

    if (allowed) {
      continue;
    }

    const { error: upErr } = await admin
      .from("carriers")
      .update({
        compliance_status: "inactive",
        is_active_authority: false,
        compliance_log: logText,
        compliance_alert: logText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("compliance_status", "active");

    if (upErr) {
      errors.push(`${row.name}: ${upErr.message}`);
      continue;
    }

    deactivatedCarriers.push({
      name: row.name,
      mc: row.mc_number ?? "—",
      dot: row.dot_number ?? "—",
      id: row.id,
    });
  }

  if (deactivatedCarriers.length > 0) {
    if (resendPlainConfigured()) {
      try {
        const to =
          process.env.COMPLIANCE_ALERT_EMAIL?.trim() || DEFAULT_ALERT_EMAIL;
        const body = [
          "The nightly FMCSA compliance job detected carrier authority that is no longer ACTIVE (inactive, revoked, or not allowed to operate):",
          "",
          ...deactivatedCarriers.map(
            (c) => `• ${c.name} — MC ${c.mc}, DOT ${c.dot} — carrier_id=${c.id}`
          ),
          "",
          `Each record was updated with: ${logText}`,
          "",
          "Notify affected dispatchers and re-verify carriers in NexusFreight before assigning loads.",
        ].join("\n");

        await sendResendPlainText({
          to,
          subject: "⚠️ URGENT: Carrier Authority Revocation Detected",
          text: body,
        });
      } catch (e) {
        errors.push(
          `Resend failed: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    } else {
      console.warn(
        "[fmcsa-compliance] RESEND_API_KEY not set; alert email skipped"
      );
    }
  }

  return {
    ok: errors.length === 0,
    checked: list.length,
    deactivated: deactivatedCarriers.length,
    skippedNoIdentifier,
    skippedApiError,
    errors,
  };
}
