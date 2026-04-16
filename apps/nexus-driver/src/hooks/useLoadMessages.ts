import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";

export type LoadMessageRow = {
  id: string;
  load_id: string;
  org_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
};

export function useLoadMessages(loadId: string | undefined, orgId: string | undefined) {
  const [messages, setMessages] = useState<LoadMessageRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!loadId) {
      setMessages([]);
      return;
    }
    const client = getSupabase();
    if (!client) return;
    setLoading(true);
    const { data, error } = await client
      .from("load_messages")
      .select("id, load_id, org_id, sender_user_id, body, created_at")
      .eq("load_id", loadId)
      .order("created_at", { ascending: true });
    if (!error) setMessages((data as LoadMessageRow[]) ?? []);
    setLoading(false);
  }, [loadId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const client = getSupabase();
    if (!client || !loadId) return;
    const channel = client
      .channel(`load-msg-${loadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "load_messages",
          filter: `load_id=eq.${loadId}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [loadId, refresh]);

  const send = useCallback(
    async (body: string) => {
      if (!loadId || !orgId) return { ok: false as const, error: "missing" };
      const client = getSupabase();
      if (!client) return { ok: false as const, error: "client" };
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) return { ok: false as const, error: "auth" };
      const { error } = await client.from("load_messages").insert({
        load_id: loadId,
        org_id: orgId,
        sender_user_id: user.id,
        body: body.trim(),
      });
      if (error) return { ok: false as const, error: error.message };
      await refresh();
      return { ok: true as const };
    },
    [loadId, orgId, refresh]
  );

  return { messages, loading, refresh, send };
}
