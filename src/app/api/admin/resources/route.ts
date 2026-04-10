import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";
import {
  isReservedResourceSlug,
  normalizeResourceSlug,
  slugifyTitle,
} from "@/lib/resources/slug";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type { Resource } from "@/types/database";

export const runtime = "nodejs";

export async function GET() {
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

  const { data, error } = await svc
    .from("resources")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ resources: data as Resource[] });
}

export async function POST(req: Request) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }

  const rawSlug =
    typeof b.slug === "string" && b.slug.trim()
      ? b.slug.trim()
      : slugifyTitle(title);
  const slug = normalizeResourceSlug(rawSlug);
  if (!slug) {
    return NextResponse.json(
      { error: "Could not derive a valid slug." },
      { status: 400 }
    );
  }
  if (isReservedResourceSlug(slug)) {
    return NextResponse.json(
      { error: "That slug is reserved for a static resource page." },
      { status: 400 }
    );
  }

  const excerpt = typeof b.excerpt === "string" ? b.excerpt : "";
  const content = typeof b.content === "string" ? b.content : "";
  const category =
    typeof b.category === "string" && b.category.trim()
      ? b.category.trim()
      : "General";
  const image_url =
    typeof b.image_url === "string" && b.image_url.trim()
      ? b.image_url.trim()
      : null;

  let published_at: string | null = null;
  if (b.published_at != null && b.published_at !== "") {
    if (typeof b.published_at === "string") {
      const d = new Date(b.published_at);
      if (!Number.isNaN(d.getTime())) {
        published_at = d.toISOString();
      }
    }
  }

  const insert = {
    title,
    slug: slug.toLowerCase(),
    excerpt,
    content,
    category,
    image_url,
    published_at,
  };

  const { data, error } = await svc
    .from("resources")
    .insert(insert)
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
  revalidatePath(`/resources/${insert.slug}`);

  return NextResponse.json({ resource: data as Resource });
}
