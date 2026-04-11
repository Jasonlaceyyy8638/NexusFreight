"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  AGENCY_LOGO_PATH_KEY,
  extFromImageMime,
  mergeOrgSettingsPatch,
} from "@/lib/org/agency-logo-settings";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "org_branding";
const MAX_BYTES = 2 * 1024 * 1024;

type Props = {
  supabase: SupabaseClient;
  orgId: string;
  /** Only organization `Admin` can update `organizations` (RLS). */
  canManage: boolean;
  interactiveDemo: boolean;
  usingDemo: boolean;
  isCarrierOrg: boolean;
};

export function OrgLogoSettingsSection({
  supabase,
  orgId,
  canManage,
  interactiveDemo,
  usingDemo,
  isCarrierOrg,
}: Props) {
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refreshPreview = useCallback(
    async (path: string | null) => {
      if (!path) {
        setPreviewUrl(null);
        return;
      }
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 6);
      if (error || !data?.signedUrl) {
        setPreviewUrl(null);
        return;
      }
      setPreviewUrl(data.signedUrl);
    },
    [supabase]
  );

  const loadOrgSettings = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", orgId)
        .maybeSingle();
      if (error) throw error;
      const s = data?.settings as Record<string, unknown> | null | undefined;
      const p =
        typeof s?.[AGENCY_LOGO_PATH_KEY] === "string"
          ? (s[AGENCY_LOGO_PATH_KEY] as string).trim() || null
          : null;
      setLogoPath(p);
      await refreshPreview(p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load organization.");
    } finally {
      setLoading(false);
    }
  }, [supabase, orgId, refreshPreview]);

  useEffect(() => {
    void loadOrgSettings();
  }, [loadOrgSettings]);

  const onPickFile = async (file: File | null) => {
    setErr(null);
    if (!file || interactiveDemo || usingDemo) return;
    if (!canManage) {
      toast.message("Only an organization admin can update the logo.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setErr("Image must be 2 MB or smaller.");
      return;
    }
    const ext = extFromImageMime(file.type);
    if (!ext) {
      setErr("Use PNG, JPEG, or WebP.");
      return;
    }
    setBusy(true);
    try {
      const path = `${orgId}/agency-logo.${ext}`;
      if (logoPath && logoPath !== path) {
        await supabase.storage.from(BUCKET).remove([logoPath]);
      }
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });
      if (upErr) throw new Error(upErr.message);

      const { data: orgRow, error: orgErr } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", orgId)
        .maybeSingle();
      if (orgErr) throw orgErr;
      const nextSettings = mergeOrgSettingsPatch(orgRow?.settings, {
        [AGENCY_LOGO_PATH_KEY]: path,
      });
      const { error: saveErr } = await supabase
        .from("organizations")
        .update({
          settings: nextSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orgId);
      if (saveErr) throw saveErr;

      setLogoPath(path);
      await refreshPreview(path);
      toast.success("Logo saved.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    setErr(null);
    if (!canManage || !logoPath || interactiveDemo || usingDemo) return;
    setBusy(true);
    try {
      await supabase.storage.from(BUCKET).remove([logoPath]);
      const { data: orgRow, error: orgErr } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", orgId)
        .maybeSingle();
      if (orgErr) throw orgErr;
      const cur = mergeOrgSettingsPatch(orgRow?.settings, {});
      delete cur[AGENCY_LOGO_PATH_KEY];
      const { error: saveErr } = await supabase
        .from("organizations")
        .update({
          settings: cur,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orgId);
      if (saveErr) throw saveErr;
      setLogoPath(null);
      setPreviewUrl(null);
      toast.success("Logo removed.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not remove logo.";
      setErr(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const title = isCarrierOrg ? "Company logo" : "Agency logo";
  const hint = isCarrierOrg
    ? "Shown on carrier-facing materials where your brand is used."
    : "Used for broker packets and agency-branded surfaces as we roll them out.";

  if (usingDemo || interactiveDemo) {
    return (
      <section className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">
          Logo upload is available in a live workspace, not in this preview.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/10 bg-[#16181A]/90 p-6">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading…
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/30">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL; host varies by project
              <img
                src={previewUrl}
                alt=""
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <ImageIcon className="h-10 w-10 text-slate-600" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#007bff]/45 bg-[#007bff]/15 px-3 py-2 text-sm font-semibold text-[#7eb8ff] hover:bg-[#007bff]/25 has-disabled:cursor-not-allowed has-disabled:opacity-50">
                  <Upload className="h-4 w-4" aria-hidden />
                  {busy ? "Working…" : "Upload image"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      e.target.value = "";
                      void onPickFile(f);
                    }}
                  />
                </label>
                {logoPath ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onRemove()}
                    className="inline-flex items-center gap-2 rounded-md border border-red-500/35 bg-red-950/30 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Remove
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Only an <strong className="text-slate-400">Administrator</strong>{" "}
                for your organization can upload or change this logo.
              </p>
            )}
            <p className="text-xs text-slate-600">
              PNG, JPEG, or WebP · up to 2 MB · square or wide logos work best.
            </p>
            {err ? (
              <p className="text-sm text-red-400" role="alert">
                {err}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
