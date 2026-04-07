"use client";

import { useCallback, useEffect, useState } from "react";
import { CarrierSelect } from "@/components/dashboard/CarrierSelect";
import type { Carrier, ServiceFeeType } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type Props = {
  open: boolean;
  onClose: () => void;
  carrier: Carrier;
  supabase: SupabaseClient;
  usingDemo: boolean;
  interactiveDemo: boolean;
  openDemoAccountGate: () => void;
  onSaved: () => void;
  canViewFinancials: boolean;
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-[#007bff]/50";

export function EditCarrierModal({
  open,
  onClose,
  carrier,
  supabase,
  usingDemo,
  interactiveDemo,
  openDemoAccountGate,
  onSaved,
  canViewFinancials,
}: Props) {
  const [feeType, setFeeType] = useState<ServiceFeeType>("percent");
  const [feePercent, setFeePercent] = useState("10");
  const [flatUsd, setFlatUsd] = useState("250");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneCarrier, setPhoneCarrier] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFeeType(carrier.service_fee_type ?? "percent");
    setFeePercent(String(carrier.fee_percent ?? 10));
    setFlatUsd(
      carrier.service_fee_flat_cents != null
        ? (carrier.service_fee_flat_cents / 100).toFixed(2)
        : "250.00"
    );
    setContactEmail(carrier.contact_email ?? "");
    setPhoneCarrier(carrier.phone_carrier ?? "");
    setError(null);
  }, [carrier]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    if (usingDemo) {
      alert("Connect Supabase to edit carriers.");
      return;
    }

    const pct = parseFloat(feePercent);
    if (canViewFinancials && feeType === "percent") {
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        setError("Fee % must be between 0 and 100.");
        return;
      }
    }
    const flatCents =
      feeType === "flat"
        ? Math.round(parseFloat(flatUsd || "0") * 100)
        : null;
    if (canViewFinancials && feeType === "flat") {
      if (flatCents == null || Number.isNaN(flatCents) || flatCents < 0) {
        setError("Enter a valid flat fee amount.");
        return;
      }
    }

    setBusy(true);
    try {
      const patch: Record<string, unknown> = {
        contact_email: contactEmail.trim() || null,
        phone_carrier: phoneCarrier.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (canViewFinancials) {
        patch.service_fee_type = feeType;
        patch.fee_percent = feeType === "percent" ? pct : carrier.fee_percent;
        patch.service_fee_flat_cents = feeType === "flat" ? flatCents : null;
      }
      const { error: upErr } = await supabase
        .from("carriers")
        .update(patch)
        .eq("id", carrier.id);
      if (upErr) throw upErr;
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save carrier");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-carrier-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-[#1A1C1E] p-6 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.85)]"
      >
        <h2 id="edit-carrier-title" className="text-lg font-semibold text-white">
          Edit carrier
        </h2>
        <p className="mt-1 text-sm text-slate-400">{carrier.name}</p>

        <form className="mt-6 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          {canViewFinancials ? (
            <>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Service fee
                </p>
                <div className="mt-2 flex gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                    <input
                      type="radio"
                      name="feeType"
                      checked={feeType === "percent"}
                      onChange={() => setFeeType("percent")}
                    />
                    Percentage (%)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                    <input
                      type="radio"
                      name="feeType"
                      checked={feeType === "flat"}
                      onChange={() => setFeeType("flat")}
                    />
                    Flat fee
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
              Service fee settings are visible only to users with &ldquo;Can view
              financials.&rdquo;
            </p>
          )}

          <label className="block text-sm font-medium text-slate-200">
            Settlement & documents email
            <input
              type="email"
              className={inputClass}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Wireless carrier (optional)
            <CarrierSelect
              className={inputClass}
              value={phoneCarrier}
              onChange={setPhoneCarrier}
            />
          </label>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(0,123,255,0.25)] hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
