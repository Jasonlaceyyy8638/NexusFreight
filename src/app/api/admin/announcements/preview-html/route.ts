import { NextResponse } from "next/server";
import {
  buildProductUpdateEmailHtml,
} from "@/lib/admin/announcement-email-html";
import { getAdminUserOrNull } from "@/lib/admin/require-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const admin = await getAdminUserOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: { title?: string; body?: string };
  try {
    body = (await req.json()) as { title?: string; body?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const title = (body.title ?? "").trim() || "Preview title";
  const text = (body.body ?? "").trim() || "Your update body will appear here.";

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "https://nexusfreight.tech";
  const base = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  const root = base.replace(/\/$/, "");

  const html = buildProductUpdateEmailHtml({
    title,
    bodyText: text,
    dashboardUrl: `${root}/dashboard`,
    logoUrl: `${root}/nexusfreight-logo-v2.svg`,
    unsubscribeUrl: `${root}/api/unsubscribe/announcements?preview=1`,
    isPreview: true,
  });

  return NextResponse.json({ html });
}
