type PageProps = { params: Promise<{ loadId: string }> };

export default async function TrackLoadPage({ params }: PageProps) {
  const { loadId } = await params;
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-nf-neutral px-6 py-16 text-nf-midnight">
      <div className="w-full max-w-md rounded-sm border border-nf-border bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          NexusFreight
        </p>
        <h1 className="mt-2 text-lg font-semibold">Load tracking</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Reference ID <span className="font-mono text-nf-midnight">{loadId}</span>
          . Connect this view to your TMS or telematics feed to show live ETA
          and document status for the driver-facing experience.
        </p>
      </div>
    </div>
  );
}
