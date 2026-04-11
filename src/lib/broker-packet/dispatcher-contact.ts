import type { SupabaseClient } from "@supabase/supabase-js";

/** Dispatcher identity for broker packet cover & email footers. */
export async function getDispatcherContactForBrokerPacket(
  supabase: SupabaseClient,
  userId: string
): Promise<{ name: string; email: string; phone: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email?.trim() ?? "";

  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name, phone_number, phone")
    .eq("id", userId)
    .maybeSingle();

  const p = prof as {
    full_name?: string | null;
    phone_number?: string | null;
    phone?: string | null;
  } | null;

  const raw = p?.full_name?.trim();
  const name =
    raw && raw.length > 0
      ? raw
      : email
        ? email.split("@")[0].replace(/[._]/g, " ")
        : "Dispatcher";

  const phone =
    p?.phone_number?.trim() || p?.phone?.trim() || "—";

  return { name, email: email || "—", phone };
}
