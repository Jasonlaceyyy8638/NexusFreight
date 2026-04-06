import { sendTransactionalEmail, sendgridConfigured } from "@/lib/email/sendgrid-send";
import type { EldProvider } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

function providerLabel(p: EldProvider): string {
  if (p === "samsara") return "Samsara";
  if (p === "motive") return "Motive";
  return "Geotab";
}

export async function finalizeMagicLinkEldConnection(
  admin: SupabaseClient,
  input: {
    inviteRowId: string;
    carrierId: string;
    carrierName: string;
    orgId: string;
    provider: EldProvider;
    requesterEmail: string | null;
    requesterProfileId: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const nowIso = new Date().toISOString();

  const { error: hErr } = await admin
    .from("carriers")
    .update({ eld_handshake_completed_at: nowIso })
    .eq("id", input.carrierId);
  if (hErr) {
    return { ok: false, error: hErr.message };
  }

  const { error: doneErr } = await admin
    .from("eld_connect_invites")
    .update({ completed_at: nowIso })
    .eq("id", input.inviteRowId)
    .is("completed_at", null);
  if (doneErr) {
    return { ok: false, error: doneErr.message };
  }

  const label = providerLabel(input.provider);

  if (input.requesterProfileId) {
    await admin.from("dashboard_notifications").insert({
      org_id: input.orgId,
      profile_id: input.requesterProfileId,
      title: "ELD connection verified",
      body: `${input.carrierName} connected ${label}. Fleet GPS will update on the next sync.`,
      kind: "eld_connected",
    });
  }

  if (sendgridConfigured() && input.requesterEmail) {
    try {
      await sendTransactionalEmail({
        to: input.requesterEmail,
        subject: `[NexusFreight] ${input.carrierName} connected ${label}`,
        text: [
          `${input.carrierName} has completed the ELD connection flow.`,
          `Provider: ${label}`,
          ``,
          `You also have an in-app notification in NexusFreight. Truck GPS will update on the next sync job.`,
        ].join("\n"),
      });
    } catch {
      /* non-fatal */
    }
  }

  return { ok: true };
}
