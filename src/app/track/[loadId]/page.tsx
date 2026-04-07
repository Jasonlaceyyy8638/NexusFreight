import type { Metadata, Viewport } from "next";
import { TrackLoadView } from "@/components/track/TrackLoadView";

type PageProps = { params: Promise<{ loadId: string }> };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8f9fa",
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { loadId } = await params;
  return {
    title: "Load status | NexusFreight",
    description: `Trip status for load ${loadId.slice(0, 8)}…`,
  };
}

export default async function TrackLoadPage({ params }: PageProps) {
  const { loadId } = await params;
  return <TrackLoadView loadId={loadId} />;
}
