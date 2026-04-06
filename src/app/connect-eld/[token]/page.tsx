import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConnectEldClient } from "@/components/auth/ConnectEldClient";
import { isEldInviteTokenShape } from "@/lib/eld/invite-token";

export const metadata: Metadata = {
  title: "Connect ELD | NexusFreight",
  description: "Authorize telematics for your dispatcher on NexusFreight.",
};

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{
    verified?: string;
    provider?: string;
    motive_error?: string;
    agency?: string;
  }>;
};

export default async function ConnectEldPublicPage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  if (!isEldInviteTokenShape(token)) {
    notFound();
  }
  const q = await searchParams;

  return (
    <ConnectEldClient
      token={token}
      queryVerified={q.verified === "1"}
      queryProvider={q.provider ?? null}
      queryMotiveError={q.motive_error ?? null}
      queryAgency={q.agency ?? null}
    />
  );
}
