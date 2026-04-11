import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourceMarkdown } from "@/components/resources/ResourceMarkdown";
import { ResourceSidebarCta } from "@/components/resources/ResourceSidebarCta";
import { ResourceViewBeacon } from "@/components/resources/ResourceViewBeacon";
import { getPublishedResourceBySlug } from "@/lib/resources/public-queries";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

function metaDescription(excerpt: string, title: string): string {
  const t = excerpt.trim();
  if (t.length >= 50) return t.slice(0, 160);
  return [t, title].filter(Boolean).join(" — ").slice(0, 160);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resource = await getPublishedResourceBySlug(slug);
  if (!resource) {
    return {
      title: "Resource | NexusFreight",
      robots: { index: false, follow: false },
    };
  }
  const title = `${resource.title} | NexusFreight Resources`;
  const description = metaDescription(resource.excerpt, resource.title);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(resource.image_url
        ? { images: [{ url: resource.image_url, alt: resource.title }] }
        : {}),
    },
    twitter: {
      card: resource.image_url ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

export default async function ResourceArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const resource = await getPublishedResourceBySlug(slug);
  if (!resource) notFound();

  const published =
    resource.published_at != null
      ? new Date(resource.published_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

  return (
    <article className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-6 sm:px-6 sm:pb-24 sm:pt-8">
      <ResourceViewBeacon slug={resource.slug} />
      <nav className="text-sm text-slate-500">
        <Link
          href="/resources"
          className="font-medium text-slate-400 transition-colors hover:text-sky-400"
        >
          Resources
        </Link>
        <span className="mx-2 text-slate-600" aria-hidden>
          /
        </span>
        <span className="text-slate-500">{resource.category}</span>
      </nav>

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-12 xl:gap-16">
        <div className="min-w-0">
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-400/90">
              {resource.category}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl sm:leading-tight">
              {resource.title}
            </h1>
            {published ? (
              <p className="mt-3 text-sm text-slate-500">Published {published}</p>
            ) : null}
            {resource.excerpt ? (
              <p className="mt-6 text-lg leading-relaxed text-slate-400">
                {resource.excerpt}
              </p>
            ) : null}
          </header>

          {resource.image_url ? (
            <div className="relative mt-10 w-full max-w-full overflow-hidden rounded-xl border border-white/[0.08] bg-slate-900/50">
              {/* eslint-disable-next-line @next/next/no-img-element -- CMS URLs from various hosts */}
              <img
                src={resource.image_url}
                alt=""
                className="h-auto max-h-[min(420px,70vh)] w-full max-w-full object-contain"
              />
            </div>
          ) : null}

          <div className="mt-10 border-t border-white/[0.06] pt-10">
            <ResourceMarkdown markdown={resource.content} />
          </div>
        </div>

        <div className="mt-12 lg:mt-4 lg:sticky lg:top-28">
          <ResourceSidebarCta resourceSlug={resource.slug} />
        </div>
      </div>
    </article>
  );
}
