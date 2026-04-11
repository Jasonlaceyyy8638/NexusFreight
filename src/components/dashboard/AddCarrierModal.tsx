"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { fetchCarrierData } from "@/app/actions/fmcsa";
import { CarrierSelect } from "@/components/dashboard/CarrierSelect";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { AuthorityActiveSinceBlock } from "@/components/fmcsa/AuthorityActiveSinceBlock";
import { FmcsaVerifiedBadge } from "@/components/fmcsa/FmcsaVerifiedBadge";
import { mergeUserOnboardingWithWorkspace } from "@/lib/user-onboarding/sync";
import type { FmcsaCompanyData } from "@/lib/fmcsa_service";
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

const MIN_DIGITS = 4;

type FmcsaUiState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; data: FmcsaCompanyData }
  | { kind: "error"; message: string }
  | { kind: "missing_key" };

function carrierDisplayName(data: FmcsaCompanyData): string {
  const legal = data.legal_name.trim();
  const dba = data.dba_name.trim();
  if (dba && dba !== legal) {
    return `${legal} (DBA ${dba})`;
  }
  return legal || dba;
}

export function AddCarrierModal({
  open,
  onClose,
  orgId,
  supabase,
  usingDemo,
  onCreated,
}: Props) {
  const { permissions, carriers, authSessionUserId } = useDashboardData();
  const canFin = permissions.can_view_financials;
  const hadNoCarriersRef = useRef(false);
  useEffect(() => {
    if (open) hadNoCarriersRef.current = carriers.length === 0;
  }, [open, carriers.length]);
  const [mcInput, setMcInput] = useState("");
  const [fmcsa, setFmcsa] = useState<FmcsaUiState>({ kind: "idle" });
  const [feeType, setFeeType] = useState<ServiceFeeType>("percent");
  const [feePercent, setFeePercent] = useState("10");
  const [flatUsd, setFlatUsd] = useState("250");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneCarrier, setPhoneCarrier] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postSave, setPostSave] = useState<{
    name: string;
    authority_date: string | null;
    is_new_authority: boolean;
  } | null>(null);

  const reset = useCallback(() => {
    setMcInput("");
    setFmcsa({ kind: "idle" });
    setFeeType("percent");
    setFeePercent("10");
    setFlatUsd("250");
    setContactEmail("");
    setPhoneCarrier("");
    setError(null);
    setPostSave(null);
  }, []);

  const runFmcsaLookup = useCallback(async () => {
    setError(null);
    const digits = mcInput.replace(/\D/g, "");
    if (!mcInput.trim() || digits.length < MIN_DIGITS) {
      setFmcsa({ kind: "idle" });
      return;
    }
    setFmcsa({ kind: "loading" });
    try {
      const result = await fetchCarrierData(mcInput);
      if (!result.ok) {
        if (result.code === "missing_key") {
          setFmcsa({ kind: "missing_key" });
          return;
        }
        setFmcsa({
          kind: "error",
          message: result.error,
        });
        return;
      }
      setFmcsa({ kind: "success", data: result.data });
    } catch {
      setFmcsa({
        kind: "error",
        message:
          "MC Number not found. Please verify and try again.",
      });
    }
  }, [mcInput]);

  const companyName =
    fmcsa.kind === "success" ? carrierDisplayName(fmcsa.data) : "";
  const dotNumber = fmcsa.kind === "success" ? fmcsa.data.dot_number : "";
  const mcStored =
    fmcsa.kind === "success"
      ? fmcsa.data.mc_number || mcInput.replace(/\D/g, "")
      : "";
  const cityState = fmcsa.kind === "success" ? fmcsa.data.city_state : "";
  const operatingOk =
    fmcsa.kind === "success" &&
    fmcsa.data.operating_status_display === "ACTIVE" &&
    fmcsa.data.allowed_to_operate &&
    fmcsa.data.authority_status === "Active";

  const authorityBlocked =
    fmcsa.kind === "success" &&
    (!fmcsa.data.allowed_to_operate ||
      fmcsa.data.operating_status_display !== "ACTIVE");

  const canSave =
    !usingDemo &&
    fmcsa.kind === "success" &&
    operatingOk &&
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

    if (fmcsa.kind === "missing_key") {
      setError(
        "FMCSA verification is unavailable. Configure FMCSA_WEB_KEY or FMCSA_WEBKEY on the server."
      );
      return;
    }
    if (fmcsa.kind !== "success") {
      setError(
        "Look up the MC number with FMCSA (Tab out of the field or click Search)."
      );
      return;
    }
    if (!operatingOk) {
      setError(
        "Operating status must be ACTIVE and allowed to operate before this carrier can be added."
      );
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
        compliance_status: "active",
        compliance_alert: null,
        compliance_log: null,
        authority_date: fmcsa.data.authority_date,
        is_new_authority: fmcsa.data.is_new_authority,
        fee_percent: canFin && feeType === "percent" ? fee : 10,
        service_fee_type: canFin ? feeType : "percent",
        service_fee_flat_cents:
          canFin && feeType === "flat" ? flatCents : null,
        contact_email: contactEmail.trim() || null,
      });
      if (insErr) throw insErr;
      setPostSave({
        name: companyName.trim(),
        authority_date: fmcsa.data.authority_date,
        is_new_authority: fmcsa.data.is_new_authority,
      });
      if (
        !usingDemo &&
        authSessionUserId &&
        hadNoCarriersRef.current
      ) {
        void mergeUserOnboardingWithWorkspace(
          supabase,
          authSessionUserId,
          orgId
        ).then(() => {
          toast.success("Carrier added — your fleet just leveled up.");
        });
      }
      onCreated();
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

  const finishAfterSave = () => {
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
          {postSave ? "Carrier added" : "Add carrier"}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {postSave
            ? "This carrier is saved to your workspace. Review authority details before assigning loads."
            : "Enter an MC number, then press Tab or Search to verify with FMCSA. Saving requires ACTIVE operating status."}
        </p>

        {postSave ? (
          <div className="mt-6 space-y-5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4">
            <p className="text-sm font-medium text-white">{postSave.name}</p>
            <AuthorityActiveSinceBlock
              authority_date={postSave.authority_date}
              is_new_authority={postSave.is_new_authority}
            />
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={finishAfterSave}
                className="rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(0,123,255,0.25)] hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}

        {!postSave ? (
        <form className="mt-6 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1 text-sm font-medium text-slate-200">
              MC number
              <input
                type="text"
                className={inputClass}
                value={mcInput}
                onChange={(e) => {
                  setMcInput(e.target.value);
                  if (fmcsa.kind !== "idle" && fmcsa.kind !== "loading") {
                    setFmcsa({ kind: "idle" });
                  }
                }}
                onBlur={() => void runFmcsaLookup()}
                placeholder="MC-123456 or digits"
              />
            </label>
            <button
              type="button"
              onClick={() => void runFmcsaLookup()}
              className="shrink-0 rounded-md border border-[#007bff]/50 bg-[#007bff]/15 px-4 py-2 text-sm font-semibold text-[#5aa9ff] hover:bg-[#007bff]/25"
            >
              Search FMCSA
            </button>
          </div>

          {fmcsa.kind === "loading" ? (
            <p className="text-xs text-slate-500">Checking FMCSA…</p>
          ) : null}
          {fmcsa.kind === "missing_key" ? (
            <p className="rounded-md border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
              Configuration Error: Missing FMCSA Key — set{" "}
              <code className="text-amber-200/90">FMCSA_API_KEY</code>,{" "}
              <code className="text-amber-200/90">FMCSA_WEB_KEY</code>, or{" "}
              <code className="text-amber-200/90">FMCSA_WEBKEY</code> on the
              server.
            </p>
          ) : null}
          {fmcsa.kind === "error" ? (
            <p className="text-xs text-red-300">{fmcsa.message}</p>
          ) : null}

          {fmcsa.kind === "success" ? (
            <div
              className={`space-y-3 rounded-lg border p-4 ${
                authorityBlocked
                  ? "border-red-500/50 bg-red-950/30"
                  : "border-white/10 bg-[#121416]/80"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Legal name / DBA
                </p>
                {!authorityBlocked ? <FmcsaVerifiedBadge /> : null}
              </div>
              <p className="text-sm font-medium text-white">{companyName}</p>
              {cityState ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Business address
                  </p>
                  <p className="mt-1 text-sm text-slate-200">{cityState}</p>
                  {fmcsa.data.address && fmcsa.data.address !== cityState ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {fmcsa.data.address}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <label className="block text-sm font-medium text-slate-200">
                USDOT number
                <input
                  type="text"
                  readOnly
                  className={`${inputClass} cursor-not-allowed opacity-90`}
                  value={dotNumber}
                />
              </label>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Operating status (FMCSA)
                </p>
                <p
                  className={`mt-1 text-sm font-bold ${
                    operatingOk ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {fmcsa.data.operating_status_display}
                  {!fmcsa.data.allowed_to_operate ? (
                    <span className="ml-2 font-normal text-red-300/90">
                      — Not allowed to operate
                    </span>
                  ) : null}
                </p>
              </div>
              <AuthorityActiveSinceBlock
                authority_date={fmcsa.data.authority_date}
                is_new_authority={fmcsa.data.is_new_authority}
              />
              {authorityBlocked ? (
                <p className="text-sm font-medium text-red-300">
                  This authority cannot be added. Resolve FMCSA status before
                  assigning loads.
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
          <label className="block text-sm font-medium text-slate-200">
            Wireless carrier (optional)
            <CarrierSelect
              className={inputClass}
              value={phoneCarrier}
              onChange={setPhoneCarrier}
              placeholderLabel="— Not set —"
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Store the carrier’s SMS gateway if you use a mobile number for this MC.
            </span>
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
        ) : null}
      </div>
    </div>
  );
}
