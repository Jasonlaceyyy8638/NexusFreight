import type { Resource } from "@/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function listPublishedResources(): Promise<Resource[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("resources")
    .select(
      "id,title,slug,excerpt,content,category,published_at,image_url,created_at,updated_at"
    )
    .order("published_at", { ascending: false });

  if (error || !data) return [];
  return data as Resource[];
}

export async function getPublishedResourceBySlug(
  slug: string
): Promise<Resource | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const normalized = slug.trim().toLowerCase();
  const { data, error } = await supabase
    .from("resources")
    .select(
      "id,title,slug,excerpt,content,category,published_at,image_url,created_at,updated_at"
    )
    .eq("slug", normalized)
    .maybeSingle();

  if (error || !data) return null;
  return data as Resource;
}
