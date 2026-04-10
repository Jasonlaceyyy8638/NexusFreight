"use client";

import type { Resource } from "@/types/database";
import { BookOpen, Eye, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { slugifyTitle } from "@/lib/resources/slug";

const CATEGORY_PRESETS = [
  "Compliance",
  "Dispatching",
  "Broker Tips",
  "General",
];

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminResourcesPanel() {
  const [list, setList] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [imageUrl, setImageUrl] = useState("");
  const [publishedLocal, setPublishedLocal] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/resources", { credentials: "include" });
      const j = (await res.json()) as { resources?: Resource[]; error?: string };
      if (!res.ok) throw new Error(j.error || "Failed to load resources.");
      setList(j.resources ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load.");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const suggestedSlug = useMemo(() => slugifyTitle(title), [title]);

  const performanceSorted = useMemo(() => {
    return [...list].sort((a, b) => {
      const tb = (b.view_count ?? 0) + (b.cta_click_count ?? 0);
      const ta = (a.view_count ?? 0) + (a.cta_click_count ?? 0);
      return tb - ta;
    });
  }, [list]);

  useEffect(() => {
    if (!slugTouched && !editingId && title.trim()) {
      setSlug(suggestedSlug);
    }
  }, [suggestedSlug, slugTouched, editingId, title]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setExcerpt("");
    setContent("");
    setCategory("General");
    setImageUrl("");
    setPublishedLocal("");
    setErr(null);
  }, []);

  const editRow = useCallback((r: Resource) => {
    setEditingId(r.id);
    setTitle(r.title);
    setSlug(r.slug);
    setSlugTouched(true);
    setExcerpt(r.excerpt);
    setContent(r.content);
    setCategory(r.category || "General");
    setImageUrl(r.image_url ?? "");
    setPublishedLocal(toDatetimeLocalValue(r.published_at));
    setErr(null);
  }, []);

  const save = useCallback(async () => {
    setErr(null);
    if (!title.trim()) {
      setErr("Title is required.");
      return;
    }
    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      excerpt,
      content,
      category: category.trim() || "General",
      image_url: imageUrl.trim() || null,
      published_at:
        publishedLocal.trim() === ""
          ? null
          : new Date(publishedLocal).toISOString(),
    };

    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/resources/${editingId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(j.error || "Save failed.");
      } else {
        const res = await fetch("/api/admin/resources", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(j.error || "Create failed.");
      }
      await load();
      resetForm();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [
    title,
    slug,
    excerpt,
    content,
    category,
    imageUrl,
    publishedLocal,
    editingId,
    load,
    resetForm,
  ]);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <BookOpen className="h-7 w-7 text-emerald-400" aria-hidden />
        <h2 className="text-xl font-semibold tracking-tight text-white">
          Marketing resources
        </h2>
        <button
          type="button"
          onClick={() => resetForm()}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" />
          New guide
        </button>
      </div>

      <p className="max-w-3xl text-sm text-slate-400">
        Published guides appear on{" "}
        <Link
          href="/resources"
          className="font-medium text-sky-400 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          /resources
        </Link>{" "}
        with clean URLs{" "}
        <code className="text-slate-300">/resources/your-slug</code>. Leave publish
        empty for a draft (not public). Body uses Markdown (headings, lists, links,
        code fences).
      </p>

      <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-5 sm:px-5">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-sky-400" aria-hidden />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Content performance
          </h3>
        </div>
        <p className="mt-2 max-w-2xl text-xs text-slate-500">
          Views and beta CTA taps from live article traffic (after migration{" "}
          <code className="text-slate-400">00058</code>). Sort by total engagement
          to spot what to double down on.
        </p>
        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : performanceSorted.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No resources yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border border-slate-800">
            <table className="w-full min-w-[520px] text-left text-xs text-slate-300 sm:text-sm">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Title</th>
                  <th className="px-3 py-2 font-semibold">Views</th>
                  <th className="px-3 py-2 font-semibold">CTA</th>
                  <th className="px-3 py-2 font-semibold">Total</th>
                  <th className="px-3 py-2 font-semibold"> </th>
                </tr>
              </thead>
              <tbody>
                {performanceSorted.map((r) => {
                  const v = r.view_count ?? 0;
                  const c = r.cta_click_count ?? 0;
                  return (
                    <tr
                      key={`perf-${r.id}`}
                      className="border-b border-slate-800/80 last:border-0"
                    >
                      <td className="px-3 py-2 font-medium text-white">
                        {r.title}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-400">
                        {v.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-slate-400">
                        {c.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 tabular-nums font-semibold text-sky-200/90">
                        {(v + c).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.published_at ? (
                          <Link
                            href={`/resources/${r.slug}`}
                            className="text-sky-400 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </Link>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/50">
        {loading ? (
          <div className="flex items-center gap-2 px-4 py-8 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : list.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-500">No resources yet.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Title</th>
                <th className="px-3 py-2 font-semibold">Slug</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Updated</th>
                <th className="px-3 py-2 font-semibold"> </th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-slate-800/80 last:border-0"
                >
                  <td className="px-3 py-2 font-medium text-white">{r.title}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-400">
                    {r.slug}
                  </td>
                  <td className="px-3 py-2">
                    {r.published_at ? (
                      <span className="text-emerald-300/90">Published</span>
                    ) : (
                      <span className="text-amber-200/80">Draft</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500">
                    {new Date(r.updated_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => editRow(r)}
                      className="text-sky-400 hover:underline"
                    >
                      Edit
                    </button>
                    {r.published_at ? (
                      <Link
                        href={`/resources/${r.slug}`}
                        className="ml-3 text-slate-400 hover:text-sky-400"
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-6 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {editingId ? "Edit resource" : "Create resource"}
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="res-title"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Title
              </label>
              <input
                id="res-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50"
                placeholder="Guide title"
                autoComplete="off"
              />
            </div>
            <div>
              <label
                htmlFor="res-slug"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Slug (URL)
              </label>
              <input
                id="res-slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-sky-500/50"
                placeholder="auto from title"
                autoComplete="off"
              />
            </div>
            <div>
              <label
                htmlFor="res-cat"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Category
              </label>
              <input
                id="res-cat"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="res-cat-presets"
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50"
              />
              <datalist id="res-cat-presets">
                {CATEGORY_PRESETS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label
                htmlFor="res-excerpt"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Excerpt (SEO / card blurb)
              </label>
              <textarea
                id="res-excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm leading-relaxed text-white outline-none focus:border-sky-500/50"
              />
            </div>
            <div>
              <label
                htmlFor="res-img"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Image URL (optional)
              </label>
              <input
                id="res-img"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-sky-500/50"
                placeholder="https://…"
                autoComplete="off"
              />
            </div>
            <div>
              <label
                htmlFor="res-pub"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Publish at (empty = draft)
              </label>
              <input
                id="res-pub"
                type="datetime-local"
                value={publishedLocal}
                onChange={(e) => setPublishedLocal(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="res-md"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Markdown content
            </label>
            <textarea
              id="res-md"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={26}
              spellCheck={false}
              className="mt-2 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-slate-100 outline-none focus:border-sky-500/50"
              placeholder={"## Section\n\n- Bullet\n\n```\ncode\n```"}
            />
          </div>
        </div>

        {err ? (
          <p className="mt-4 text-sm text-red-400 whitespace-pre-wrap" role="alert">
            {err}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving || !title.trim()}
            onClick={() => void save()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : editingId ? (
              "Save changes"
            ) : (
              "Create resource"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
