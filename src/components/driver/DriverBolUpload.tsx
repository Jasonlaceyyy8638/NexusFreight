"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  orgId: string;
  driverId: string;
  loadId: string | null;
};

function safeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

export function DriverBolUpload({ orgId, driverId, loadId }: Props) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !supabase) return;
    setUploading(true);
    setMessage(null);
    const folder = loadId ?? "unassigned";
    const path = `${orgId}/${driverId}/${folder}/${Date.now()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage
      .from("driver_bol")
      .upload(path, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
    setUploading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("BOL uploaded. Dispatch can review it in the office.");
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#16181A]/80 p-4">
      <p className="text-sm font-semibold text-white">Bill of lading</p>
      <p className="mt-1 text-xs text-slate-500">
        Snap a photo of your BOL — it saves to your company’s secure folder.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => void onFile(e)}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:border-[#007bff]/40 hover:bg-white/10 disabled:opacity-50"
      >
        <Camera className="h-5 w-5 text-[#007bff]" strokeWidth={2} aria-hidden />
        {uploading ? "Uploading…" : "Take photo / upload BOL"}
      </button>
      {message ? (
        <p
          className={`mt-3 text-center text-xs ${
            message.startsWith("BOL") ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
