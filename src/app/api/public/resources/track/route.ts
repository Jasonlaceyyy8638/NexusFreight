import { NextResponse } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Public, unauthenticated increment for resource guide engagement (service role RPC).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const slug =
    typeof b.slug === "string" ? b.slug.trim().toLowerCase() : "";
  const kind =
    typeof b.event === "string" ? b.event.trim().toLowerCase() : "";

  if (!slug || slug.length > 200 || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  }
  if (kind !== "view" && kind !== "cta") {
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  }

  const svc = createServiceRoleSupabaseClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 503 }
    );
  }

  const { error } = await svc.rpc("increment_resource_metric", {
    p_slug: slug,
    p_kind: kind,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
