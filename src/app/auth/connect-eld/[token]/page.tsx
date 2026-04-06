import { redirect } from "next/navigation";
import { isEldInviteTokenShape } from "@/lib/eld/invite-token";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Legacy URL — use /connect-eld/[token]. */
export default async function LegacyAuthConnectEldRedirect({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  if (!isEldInviteTokenShape(token)) {
    redirect("/");
  }
  const q = await searchParams;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (typeof v === "string") usp.set(k, v);
    else if (Array.isArray(v) && v[0]) usp.set(k, v[0]);
  }
  const qs = usp.toString();
  redirect(`/connect-eld/${token}${qs ? `?${qs}` : ""}`);
}
