import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import {
  isReservedResourceSlug,
  normalizeResourceSlug,
} from "@/lib/resources/slug";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type { Resource } from "@/types/database";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await getAdminUserOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const svc = createServiceRoleSupabaseClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 503 }
    );
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (typeof b.title === "string") updates.title = b.title.trim();
  if (typeof b.excerpt === "string") updates.excerpt = b.excerpt;
  if (typeof b.content === "string") updates.content = b.content;
  if (typeof b.category === "string") {
    updates.category = b.category.trim() || "General";
  }

  if (b.image_url === null) {
    updates.image_url = null;
  } else if (typeof b.image_url === "string") {
    updates.image_url = b.image_url.trim() || null;
  }

  if ("published_at" in b) {
    if (b.published_at === null || b.published_at === "") {
      updates.published_at = null;
    } else if (typeof b.published_at === "string") {
      const d = new Date(b.published_at);
      updates.published_at = Number.isNaN(d.getTime())
        ? null
        : d.toISOString();
    }
  }

  if (typeof b.slug === "string" && b.slug.trim()) {
    const slug = normalizeResourceSlug(b.slug.trim());
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
    }
    if (isReservedResourceSlug(slug)) {
      return NextResponse.json(
        { error: "That slug is reserved for a static resource page." },
        { status: 400 }
      );
    }
    updates.slug = slug.toLowerCase();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { data: before } = await svc
    .from("resources")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await svc
    .from("resources")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A resource with this slug already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/resources");
  const prevSlug =
    before && typeof before === "object" && "slug" in before
      ? String((before as { slug: string }).slug)
      : null;
  if (prevSlug) {
    revalidatePath(`/resources/${prevSlug}`);
  }
  if (data && typeof data === "object" && "slug" in data) {
    revalidatePath(`/resources/${(data as Resource).slug}`);
  }

  return NextResponse.json({ resource: data as Resource });
}
