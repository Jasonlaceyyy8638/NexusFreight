"use client";

import { useState } from "react";
import type { LeadRole } from "@/types/database";

const ROLES: LeadRole[] = ["Dispatcher", "Fleet Owner", "Owner-Operator"];

const SUCCESS_COPY =
  "Thanks! You're on the list. We'll notify you as soon as the Driver App goes live and send you our exclusive Carrier Onboarding Guide.";

type FormState = "idle" | "submitting" | "success" | "error";

export function LandingLeadCapture() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <section
      id="lead-capture"
      className="scroll-mt-24 border-t border-white/[0.06] bg-[#121416] px-6 py-20 sm:py-24"
      aria-labelledby="lead-capture-heading"
    >
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <h2
            id="lead-capture-heading"
            className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
          >
            Join the Network
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-400">
            Get early access to the driver app, product updates, and our carrier
            onboarding guide.
          </p>
        </div>

        {state === "success" ? (
          <p
            className="mt-10 rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-5 py-6 text-center text-base leading-relaxed text-emerald-100/95"
            role="status"
          >
            {SUCCESS_COPY}
          </p>
        ) : (
          <form
            className="mx-auto mt-10 flex max-w-md flex-col gap-4 text-left"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              const full_name = String(fd.get("full_name") ?? "").trim();
              const company_name = String(fd.get("company_name") ?? "").trim();
              const email = String(fd.get("email") ?? "").trim();
              const role = String(fd.get("role") ?? "").trim();

              setState("submitting");
              setErrorMessage(null);
              try {
                const res = await fetch("/api/leads", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    full_name,
                    company_name,
                    email,
                    role,
                  }),
                });
                const json = (await res.json().catch(() => ({}))) as {
                  error?: string;
                };
                if (!res.ok) {
                  setState("error");
                  setErrorMessage(
                    typeof json.error === "string"
                      ? json.error
                      : "Something went wrong. Please try again."
                  );
                  return;
                }
                setState("success");
                form.reset();
              } catch {
                setState("error");
                setErrorMessage("Network error. Check your connection and try again.");
              }
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Name
              </span>
              <input
                name="full_name"
                type="text"
                required
                autoComplete="name"
                maxLength={200}
                placeholder="Your name"
                className="min-h-12 w-full rounded-lg border border-white/15 bg-[#0D0E10] px-4 text-base text-white placeholder:text-slate-500 outline-none ring-[#3B82F6]/40 transition-shadow focus:border-[#3B82F6]/50 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Company name
              </span>
              <input
                name="company_name"
                type="text"
                required
                autoComplete="organization"
                maxLength={200}
                placeholder="Company or fleet"
                className="min-h-12 w-full rounded-lg border border-white/15 bg-[#0D0E10] px-4 text-base text-white placeholder:text-slate-500 outline-none ring-[#3B82F6]/40 transition-shadow focus:border-[#3B82F6]/50 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email address
              </span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                maxLength={320}
                placeholder="you@company.com"
                className="min-h-12 w-full rounded-lg border border-white/15 bg-[#0D0E10] px-4 text-base text-white placeholder:text-slate-500 outline-none ring-[#3B82F6]/40 transition-shadow focus:border-[#3B82F6]/50 focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Role
              </span>
              <select
                name="role"
                required
                defaultValue=""
                className="min-h-12 w-full rounded-lg border border-white/15 bg-[#0D0E10] px-4 text-base text-white outline-none ring-[#3B82F6]/40 transition-shadow focus:border-[#3B82F6]/50 focus:ring-2"
              >
                <option value="" disabled>
                  Select your role
                </option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            {state === "error" && errorMessage ? (
              <p className="text-sm text-red-400" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={state === "submitting"}
              className="min-h-12 w-full rounded-lg bg-[#3B82F6] text-base font-bold text-white transition-colors hover:bg-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121416] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {state === "submitting" ? "Joining…" : "Join the Network"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
