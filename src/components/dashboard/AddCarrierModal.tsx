"use client";

import { useCallback, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { FmcsaVerifiedBadge } from "@/components/fmcsa/FmcsaVerifiedBadge";
import { useFmcsaMcLookup } from "@/lib/hooks/useFmcsaMcLookup";
import type { ServiceFeeType } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type Props = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  supabase: SupabaseClient;
  usingDemo: boolean;
  onCreated: () => void;
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";

export function AddCarrierModal({
  open,
  onClose,
  orgId,
  supabase,
  usingDemo,
  onCreated,
}: Props) {
  const { permissions } = useDashboardData();
  const canFin = permissions.can_view_financials;
  const [mcInput, setMcInput] = useState("");
  const [feeType, setFeeType] = useState<ServiceFeeType>("percent");
  const [feePercent, setFeePercent] = useState("10");
  const [flatUsd, setFlatUsd] = useState("250");
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmcsa = useFmcsaMcLookup(open ? mcInput : "");

  const reset = useCallback(() => {
    setMcInput("");
    setFeeType("percent");
    setFeePercent("10");
    setFlatUsd("250");
    setContactEmail("");
    setError(null);
  }, []);

  const companyName = fmcsa.status === "success" ? fmcsa.data.legal_name : "";
  const dotNumber = fmcsa.status === "success" ? fmcsa.data.dot_number : "";
  const mcStored =
    fmcsa.status === "success"
      ? fmcsa.data.mc_number || mcInput.replace(/\D/g, "")
      : "";
  const authorityActive =
    fmcsa.status === "success" && fmcsa.data.authority_status === "Active";

  const canSave =
    !usingDemo &&
    fmcsa.status === "success" &&
    authorityActive &&
    companyName.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (usingDemo) {
      alert(
        "Demo mode uses sample data. Connect Supabase and sign in to add carriers to your organization."
      );
      return;
    }

    if (fmcsa.status === "missing_key") {
      setError(
        "FMCSA verification is unavailable. Configure FMCSA_WEB_KEY on the server."
      );
      return;
    }
    if (fmcsa.status !== "success") {
      setError("Verify the MC number with FMCSA before saving.");
      return;
    }
    if (!authorityActive) {
      setError("Only carriers with active FMCSA authority can be added.");
      return;
    }

    const fee = parseFloat(feePercent);
    const flatCents = Math.round(parseFloat(flatUsd || "0") * 100);
    if (canFin && feeType === "percent") {
      if (Number.isNaN(fee) || fee < 0 || fee > 100) {
        setError("Fee % must be between 0 and 100.");
        return;
      }
    }
    if (canFin && feeType === "flat") {
      if (Number.isNaN(flatCents) || flatCents < 0) {
        setError("Enter a valid flat fee per delivered load.");
        return;
      }
    }

    setBusy(true);
    try {
      const { error: insErr } = await supabase.from("carriers").insert({
        org_id: orgId,
        name: companyName.trim(),
        mc_number: mcStored || null,
        dot_number: dotNumber || null,
        is_active_authority: true,
        fee_percent: canFin && feeType === "percent" ? fee : 10,
        service_fee_type: canFin ? feeType : "percent",
        service_fee_flat_cents:
          canFin && feeType === "flat" ? flatCents : null,
        contact_email: contactEmail.trim() || null,
      });
      if (insErr) throw insErr;
      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add carrier");
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-carrier-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-[#1A1C1E] p-6 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)]"
      >
        <h2
          id="add-carrier-title"
          className="text-lg font-semibold text-white"
        >
          Add carrier
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          MC is checked against FMCSA. Saving requires an active operating
          authority.
        </p>

        <form className="mt-6 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <label className="block text-sm font-medium text-slate-200">
            MC number
            <input
              type="text"
              className={inputClass}
              value={mcInput}
              onChange={(e) => setMcInput(e.target.value)}
              placeholder="MC-123456 or digits"
            />
          </label>

          {fmcsa.status === "loading" ? (
            <p className="text-xs text-slate-500">Checking FMCSA…</p>
          ) : null}
          {fmcsa.status === "missing_key" ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
              FMCSA verification is unavailable. Set{" "}
              <code className="text-amber-200/90">FMCSA_WEB_KEY</code> on the
              server to add carriers.
            </p>
          ) : null}
          {fmcsa.status === "error" ? (
            <p className="text-xs text-red-300">{fmcsa.message}</p>
          ) : null}

          {fmcsa.status === "success" ? (
            <div className="space-y-3 rounded-lg border border-white/10 bg-[#121416]/80 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Company
                </p>
                <FmcsaVerifiedBadge />
              </div>
              <p className="text-sm font-medium text-white">{companyName}</p>
              <label className="block text-sm font-medium text-slate-200">
                DOT number
                <input
                  type="text"
                  readOnly
                  className={`${inputClass} cursor-not-allowed opacity-90`}
                  value={dotNumber}
                />
              </label>
              {!authorityActive ? (
                <p className="text-sm font-medium text-red-400">
                  Authority is inactive — this carrier cannot be saved until FMCSA
                  shows active status.
                </p>
              ) : null}
            </div>
          ) : null}

          {canFin ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Service fee
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                    <input
                      type="radio"
                      name="addFeeType"
                      checked={feeType === "percent"}
                      onChange={() => setFeeType("percent")}
                    />
                    Percentage (%)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                    <input
                      type="radio"
                      name="addFeeType"
                      checked={feeType === "flat"}
                      onChange={() => setFeeType("flat")}
                    />
                    Flat fee / load
                  </label>
                </div>
              </div>
              {feeType === "percent" ? (
                <label className="block text-sm font-medium text-slate-200">
                  Fee %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    className={inputClass}
                    value={feePercent}
                    onChange={(e) => setFeePercent(e.target.value)}
                  />
                </label>
              ) : (
                <label className="block text-sm font-medium text-slate-200">
                  Flat fee per delivered load (USD)
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputClass}
                    value={flatUsd}
                    onChange={(e) => setFlatUsd(e.target.value)}
                  />
                </label>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Default 10% service fee applies until an admin grants &ldquo;Can view
              financials&rdquo; to customize fees.
            </p>
          )}
          <label className="block text-sm font-medium text-slate-200">
            Settlement & documents email (optional)
            <input
              type="email"
              className={inputClass}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="For settlement PDFs and rate con email"
            />
          </label>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !canSave}
              className="rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(0,123,255,0.25)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save carrier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
