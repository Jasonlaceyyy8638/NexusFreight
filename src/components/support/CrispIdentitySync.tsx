"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    /** Crisp queue (initialized by {@link CrispChatScript}). */
    $crisp?: unknown[][];
  }
}

function ensureCrispQueue(): unknown[][] {
  if (typeof window === "undefined") {
    return [];
  }
  if (!window.$crisp) {
    window.$crisp = [];
  }
  return window.$crisp;
}

function resetCrispSession(): void {
  const q = ensureCrispQueue();
  q.push(["do", "session:reset"]);
}

/**
 * Pushes Supabase user + profile into Crisp for support context.
 * @see https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/dollar-crisp/
 */
function pushIdentityToCrisp(input: {
  email: string;
  nickname: string;
  is_beta: boolean;
  trial_expiry: string | null;
}): void {
  const q = ensureCrispQueue();
  q.push(["set", "user:email", [input.email]]);
  q.push(["set", "user:nickname", [input.nickname]]);

  const pairs: [string, string | boolean][] = [["is_beta", input.is_beta]];
  if (input.trial_expiry) {
    pairs.push(["trial_expiry", input.trial_expiry]);
  } else {
    pairs.push(["trial_expiry", ""]);
  }
  // Crisp expects: ["set", "session:data", [[ [k,v], ... ]]] (nested array per docs).
  q.push(["set", "session:data", [pairs]]);
}

export function CrispIdentitySync() {
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    async function syncFromUserId(userId: string, email: string | undefined) {
      if (!supabase || !email?.trim()) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, org_id, is_beta_user, trial_ends_at")
        .eq("id", userId)
        .maybeSingle();

      const p = profile as {
        full_name?: string | null;
        org_id?: string | null;
        is_beta_user?: boolean | null;
        trial_ends_at?: string | null;
      } | null;

      let companyName: string | null = null;
      if (p?.org_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", p.org_id)
          .maybeSingle();
        companyName = (org as { name?: string } | null)?.name?.trim() || null;
      }

      const fullName = p?.full_name?.trim() || null;
      const nickname =
        companyName || fullName || email.split("@")[0] || "User";

      pushIdentityToCrisp({
        email: email.trim(),
        nickname,
        is_beta: Boolean(p?.is_beta_user),
        trial_expiry: p?.trial_ends_at ?? null,
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session?.user) {
          resetCrispSession();
          return;
        }
        if (session.user.email) {
          void syncFromUserId(session.user.id, session.user.email);
        }
      }
    );

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email) {
        await syncFromUserId(session.user.id, session.user.email);
      }
    })();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
