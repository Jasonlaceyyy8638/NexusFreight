import { NextResponse } from "next/server";
import type { BrokerDocCategory } from "@/lib/broker-packet/categories";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

function mcMatchKey(mc: string | null | undefined): string {
  return digitsOnly(mc ?? "");
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const slugNorm = slug?.trim().toLowerCase() ?? "";
  if (slugNorm.length < 4 || slugNorm.length > 64) {
    return NextResponse.json({ error: "Invalid link." }, { status: 404 });
  }

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 503 });
  }

  const { data: org, error: oErr } = await admin
    .from("organizations")
    .select("id, type")
    .eq("type", "Agency")
    .eq("onboarding_slug", slugNorm)
    .maybeSingle();

  if (oErr) {
    return NextResponse.json({ error: oErr.message }, { status: 500 });
  }
  if (!org) {
    return NextResponse.json({ error: "Invalid or expired onboarding link." }, { status: 404 });
  }

  const orgId = (org as { id: string }).id;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const carrierName = String(form.get("carrierName") ?? "").trim();
  const mcRaw = String(form.get("mcNumber") ?? "").trim();
  const dotRaw = String(form.get("dotNumber") ?? "").trim();
  const mcDigits = digitsOnly(mcRaw);
  const dotDigits = digitsOnly(dotRaw);

  if (!carrierName || carrierName.length > 200) {
    return NextResponse.json(
      { error: "Enter a valid carrier / company name." },
      { status: 400 }
    );
  }
  if (mcDigits.length < 4 || mcDigits.length > 12) {
    return NextResponse.json(
      { error: "Enter a valid MC number (at least 4 digits)." },
      { status: 400 }
    );
  }
  if (dotDigits.length < 4 || dotDigits.length > 12) {
    return NextResponse.json(
      { error: "Enter a valid DOT number (at least 4 digits)." },
      { status: 400 }
    );
  }

  const authority = form.get("authority") as File | null;
  const w9 = form.get("w9") as File | null;
  const coi = form.get("coi") as File | null;

  const triple: { file: File | null; label: string; cat: BrokerDocCategory }[] = [
    { file: authority, label: "Authority letter", cat: "operating_authority" },
    { file: w9, label: "W-9", cat: "w9" },
    { file: coi, label: "Certificate of insurance (COI)", cat: "coi" },
  ];

  for (const { file, label } of triple) {
    if (!file || typeof file === "string" || file.size === 0) {
      return NextResponse.json(
        { error: `Please upload your ${label} (photo or PDF).` },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `${label} must be under 12 MB.` },
        { status: 400 }
      );
    }
    const type = (file.type || "application/octet-stream").toLowerCase();
    if (!ALLOWED.has(type)) {
      return NextResponse.json(
        { error: `${label}: use JPG, PNG, WebP, or PDF.` },
        { status: 400 }
      );
    }
  }

  const { data: carrierRows, error: cErr } = await admin
    .from("carriers")
    .select("id, name, mc_number")
    .eq("org_id", orgId);
  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  let carrierId: string | null = null;
  const key = mcDigits;
  for (const row of carrierRows ?? []) {
    if (mcMatchKey((row as { mc_number?: string | null }).mc_number) === key) {
      carrierId = (row as { id: string }).id;
      break;
    }
  }

  if (!carrierId) {
    const { data: created, error: insErr } = await admin
      .from("carriers")
      .insert({
        org_id: orgId,
        name: carrierName,
        mc_number: mcDigits,
        dot_number: dotDigits || null,
        fee_percent: 10,
        service_fee_type: "percent",
        contact_email: null,
        is_active_authority: false,
        compliance_status: "inactive",
        compliance_alert:
          "Driver submitted documents via your onboarding link — verify FMCSA and broker packet.",
      })
      .select("id")
      .maybeSingle();
    if (insErr || !created) {
      return NextResponse.json(
        { error: insErr?.message ?? "Could not create carrier record." },
        { status: 500 }
      );
    }
    carrierId = (created as { id: string }).id;
  } else {
    const { error: patchErr } = await admin
      .from("carriers")
      .update({
        name: carrierName,
        dot_number: dotDigits || null,
        mc_number: mcDigits,
        updated_at: new Date().toISOString(),
      })
      .eq("id", carrierId)
      .eq("org_id", orgId);
    if (patchErr) {
      return NextResponse.json({ error: patchErr.message }, { status: 500 });
    }
  }

  const ts = Date.now();

  for (const { file, cat } of triple) {
    const f = file as File;
    const safe = sanitizeFilename(f.name || "upload");
    const storagePath = `${orgId}/${carrierId}/${cat}/${ts}_${safe}`;

    const buffer = Buffer.from(await f.arrayBuffer());
    const { error: upErr } = await admin.storage
      .from("broker_packet_docs")
      .upload(storagePath, buffer, {
        upsert: true,
        contentType: f.type || undefined,
      });
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { data: existing } = await admin
      .from("carrier_documents")
      .select("id, storage_path")
      .eq("carrier_id", carrierId)
      .eq("doc_category", cat)
      .maybeSingle();

    const oldPath = (existing as { storage_path?: string } | null)?.storage_path;
    if (oldPath && oldPath !== storagePath) {
      await admin.storage.from("broker_packet_docs").remove([oldPath]);
    }

    if (existing) {
      const { error: uDoc } = await admin
        .from("carrier_documents")
        .update({
          storage_path: storagePath,
          original_filename: f.name?.trim() || null,
          ...(cat === "coi" ? { expiry_date: null } : {}),
        })
        .eq("id", (existing as { id: string }).id);
      if (uDoc) {
        return NextResponse.json({ error: uDoc.message }, { status: 500 });
      }
    } else {
      const { error: iDoc } = await admin.from("carrier_documents").insert({
        org_id: orgId,
        carrier_id: carrierId,
        doc_category: cat,
        storage_path: storagePath,
        original_filename: f.name?.trim() || null,
      });
      if (iDoc) {
        return NextResponse.json({ error: iDoc.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true, carrierId });
}
