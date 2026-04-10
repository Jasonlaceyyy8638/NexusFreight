import { NextResponse } from "next/server";
import { isBrokerDocCategory } from "@/lib/broker-packet/categories";
import { getCarrierIfMember } from "@/lib/broker-packet/verify-access";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Row = {
  id: string;
  org_id: string;
  carrier_id: string;
  doc_category: string;
  storage_path: string;
  original_filename: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ carrierId: string }> }
) {
  const { carrierId } = await ctx.params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const access = await getCarrierIfMember(supabase, user.id, carrierId);
  if (!access) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("carrier_documents")
    .select("*")
    .eq("carrier_id", carrierId)
    .order("doc_category");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: (data ?? []) as Row[] });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ carrierId: string }> }
) {
  const { carrierId } = await ctx.params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const access = await getCarrierIfMember(supabase, user.id, carrierId);
  if (!access) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: {
    doc_category?: string;
    storage_path?: string;
    original_filename?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const cat = body.doc_category?.trim() ?? "";
  if (!isBrokerDocCategory(cat)) {
    return NextResponse.json({ error: "Invalid doc_category." }, { status: 400 });
  }
  const storagePath = body.storage_path?.trim() ?? "";
  const pathOk =
    storagePath.startsWith(`${access.org_id}/${carrierId}/`) &&
    storagePath.includes(`/${cat}/`);
  if (!storagePath || !pathOk) {
    return NextResponse.json(
      { error: "Invalid storage_path (expected org_id/carrier_id/category/...)." },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("carrier_documents")
    .select("id, storage_path")
    .eq("carrier_id", carrierId)
    .eq("doc_category", cat)
    .maybeSingle();

  const oldPath = (existing as { storage_path?: string } | null)?.storage_path;

  if (oldPath && oldPath !== storagePath) {
    await supabase.storage.from("broker_packet_docs").remove([oldPath]);
  }

  if (existing) {
    const patch: Record<string, unknown> = {
      storage_path: storagePath,
      original_filename: body.original_filename?.trim() || null,
    };
    if (cat === "coi") {
      patch.expiry_date = null;
    }
    const { data: updated, error: upErr } = await supabase
      .from("carrier_documents")
      .update(patch)
      .eq("id", (existing as { id: string }).id)
      .select()
      .maybeSingle();
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
    return NextResponse.json({ document: updated });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("carrier_documents")
    .insert({
      org_id: access.org_id,
      carrier_id: carrierId,
      doc_category: cat,
      storage_path: storagePath,
      original_filename: body.original_filename?.trim() || null,
    })
    .select()
    .maybeSingle();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ document: inserted }, { status: 201 });
}
