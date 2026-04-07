import { NextResponse } from "next/server";
import { sendResendPlainText } from "@/lib/email/resend-plain";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import type { LeadRole } from "@/types/database";

export const runtime = "nodejs";

const ROLES: LeadRole[] = ["Dispatcher", "Fleet Owner", "Owner-Operator"];

const NOTIFY_TO =
  process.env.LEADS_NOTIFY_EMAIL?.trim() || "info@nexusfreight.tech";

function clip(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const full_name = clip(String(o.full_name ?? ""), 200);
  const company_name = clip(String(o.company_name ?? ""), 200);
  const email = clip(String(o.email ?? ""), 320);
  const roleRaw = String(o.role ?? "").trim();

  if (!full_name || !company_name || !email) {
    return NextResponse.json(
      { error: "Name, company, and email are required." },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  if (!ROLES.includes(roleRaw as LeadRole)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const role = roleRaw as LeadRole;

  const admin = createServiceRoleSupabaseClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Server is not configured to save leads." },
      { status: 503 }
    );
  }

  const { data: row, error: insErr } = await admin
    .from("leads")
    .insert({
      full_name,
      company_name,
      email,
      role,
      source: "landing_join_network",
    })
    .select("id, created_at")
    .single();

  if (insErr) {
    console.error("[leads] insert error:", insErr.message);
    return NextResponse.json(
      { error: "Could not save your signup. Please try again later." },
      { status: 500 }
    );
  }

  const notifyBody = [
    "New lead — Join the Network",
    "",
    `Name: ${full_name}`,
    `Company: ${company_name}`,
    `Email: ${email}`,
    `Role: ${role}`,
    `Lead ID: ${row?.id ?? "—"}`,
    `Submitted (UTC): ${row?.created_at ?? new Date().toISOString()}`,
  ].join("\n");

  try {
    await sendResendPlainText({
      to: NOTIFY_TO,
      subject: `New lead: ${full_name} (${role})`,
      text: notifyBody,
    });
  } catch (e) {
    console.error("[leads] Resend notify failed:", e);
  }

  return NextResponse.json({ ok: true, id: row?.id });
}
