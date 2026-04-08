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

/** Crisp rejects some emails / nicknames and throws "Invalid data" in the chat client. */
function isLikelyCrispSafeEmail(email: string): boolean {
  const t = email.trim();
  if (t.length < 3 || t.length > 254) return false;
  // Pragmatic check; Crisp's validator is stricter than RFC.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function crispSafeNickname(raw: string, fallback: string): string {
  const s = raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 128);
  return s || fallback;
}

/**
 * Pushes Supabase user + profile into Crisp for support context.
 * Session data values are strings only (Crisp KB examples & client validation are string-heavy).
 * @see https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/dollar-crisp/
 */
function pushIdentityToCrisp(input: {
  email: string;
  nickname: string;
  is_beta: boolean;
  trial_expiry: string | null;
}): void {
  const q = ensureCrispQueue();
  const email = input.email.trim();
  if (isLikelyCrispSafeEmail(email)) {
    q.push(["set", "user:email", [email]]);
  }
  q.push(["set", "user:nickname", [input.nickname]]);

  const pairs: [string, string | boolean][] = [
    ["is_beta", input.is_beta],
  ];
  const trial = input.trial_expiry?.trim();
  if (trial) {
    pairs.push(["trial_expiry", trial]);
  }
  // Crisp docs: $crisp.push(["set", "session:data", [[[k,v], ...]]]) — third arg is [ pairs ], not pairs.
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
      const nicknameRaw =
        companyName || fullName || email.split("@")[0] || "User";
      const nickname = crispSafeNickname(nicknameRaw, "User");

      const trialRaw = p?.trial_ends_at;
      const trialExpiry =
        typeof trialRaw === "string"
          ? trialRaw
          : trialRaw != null
            ? String(trialRaw)
            : null;

      pushIdentityToCrisp({
        email: email.trim(),
        nickname,
        is_beta: Boolean(p?.is_beta_user),
        trial_expiry: trialExpiry,
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
