"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Loader2, Upload } from "lucide-react";
import { NexusFreightLogo } from "@/components/marketing/NexusFreightLogo";

type DocKey = "authority" | "w9" | "coi";

const LABELS: Record<DocKey, string> = {
  authority: "Authority letter",
  w9: "W-9",
  coi: "Insurance (COI)",
};

export function PublicCarrierOnboardForm({ slug }: { slug: string }) {
  const [carrierName, setCarrierName] = useState("");
  const [mcNumber, setMcNumber] = useState("");
  const [dotNumber, setDotNumber] = useState("");
  const [files, setFiles] = useState<Record<DocKey, File | null>>({
    authority: null,
    w9: null,
    coi: null,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const refAuthority = useRef<HTMLInputElement>(null);
  const refW9 = useRef<HTMLInputElement>(null);
  const refCoi = useRef<HTMLInputElement>(null);
  const inputRefs: Record<DocKey, React.RefObject<HTMLInputElement | null>> = {
    authority: refAuthority,
    w9: refW9,
    coi: refCoi,
  };

  const setFile = useCallback((key: DocKey, f: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: f }));
    setMsg(null);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("carrierName", carrierName.trim());
      fd.set("mcNumber", mcNumber.trim());
      fd.set("dotNumber", dotNumber.trim());
      for (const key of ["authority", "w9", "coi"] as const) {
        const f = files[key];
        if (f) fd.set(key, f);
      }
      const res = await fetch(
        `/api/public/onboard/${encodeURIComponent(slug)}/submit`,
        { method: "POST", body: fd }
      );
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(j.error || "Something went wrong.");
      }
      setDone(true);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Submit failed.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-lg font-semibold text-emerald-300">You&apos;re all set</p>
        <p className="mt-2 text-sm text-slate-300">
          Your documents were sent to your dispatcher&apos;s NexusFreight carrier vault.
          They&apos;ll review MC/DOT and your packet next.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom,0px)+1.5rem)] sm:py-12">
      <div className="mb-8 flex justify-center">
        <NexusFreightLogo className="h-9 w-auto" />
      </div>
      <h1 className="text-center text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Carrier onboarding
      </h1>
      <p className="mt-2 text-center text-sm text-slate-400">
        Upload your authority letter, W-9, and COI. Photos or PDFs are accepted.
      </p>

      <form className="mt-8 space-y-5" onSubmit={(e) => void submit(e)}>
        <label className="block text-sm font-medium text-slate-200">
          Carrier / company name
          <input
            required
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#121416] px-3 py-3 text-base text-white outline-none focus:border-[#007bff]/50"
            value={carrierName}
            onChange={(e) => setCarrierName(e.target.value)}
            autoComplete="organization"
          />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          MC number
          <input
            required
            inputMode="numeric"
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#121416] px-3 py-3 text-base text-white outline-none focus:border-[#007bff]/50"
            value={mcNumber}
            onChange={(e) => setMcNumber(e.target.value)}
            placeholder="MC-123456 or digits"
          />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          DOT number
          <input
            required
            inputMode="numeric"
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#121416] px-3 py-3 text-base text-white outline-none focus:border-[#007bff]/50"
            value={dotNumber}
            onChange={(e) => setDotNumber(e.target.value)}
            placeholder="DOT digits"
          />
        </label>

        <div className="space-y-3 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Documents
          </p>
          {(Object.keys(LABELS) as DocKey[]).map((key) => (
            <div key={key}>
              <input
                ref={inputRefs[key]}
                type="file"
                accept="image/*,.pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(key, f);
                }}
              />
              <button
                type="button"
                onClick={() => inputRefs[key].current?.click()}
                className="flex min-h-14 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100 hover:border-[#007bff]/40 hover:bg-[#007bff]/10"
              >
                <Camera className="h-5 w-5 shrink-0 text-sky-400" aria-hidden />
                <span className="min-w-0 truncate">
                  {files[key] ? files[key]?.name : `Snap a photo — ${LABELS[key]}`}
                </span>
                {files[key] ? (
                  <Upload className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                ) : null}
              </button>
            </div>
          ))}
        </div>

        {msg ? (
          <p className="text-sm text-red-300" role="alert">
            {msg}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="flex min-h-14 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#007bff] py-3.5 text-base font-semibold text-white shadow-[0_0_24px_rgba(0,123,255,0.25)] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
          {busy ? "Sending…" : "Submit to dispatcher"}
        </button>
      </form>
    </div>
  );
}
