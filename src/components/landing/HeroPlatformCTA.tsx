import Link from "next/link";

/**
 * Primary path: pricing → Stripe → signup. Secondary: sandbox demo (no account).
 */
export function HeroPlatformCTA() {
  return (
    <div className="flex w-full max-w-xl flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
      <Link
        href="/#pricing"
        className="inline-flex min-h-[48px] min-w-[168px] items-center justify-center rounded-md bg-[#007bff] px-8 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(0,123,255,0.35)] transition-[opacity,box-shadow] hover:opacity-95 hover:shadow-[0_0_32px_rgba(0,123,255,0.5)]"
      >
        Start free trial
      </Link>
      <Link
        href="/product-tour"
        className="inline-flex min-h-[48px] min-w-[168px] items-center justify-center rounded-md border border-white/25 bg-white/5 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/10"
      >
        Try sandbox
      </Link>
      <Link
        href="mailto:info@nexusfreight.tech?subject=Demo%20Request"
        className="inline-flex min-h-[48px] min-w-[168px] items-center justify-center rounded-md border border-white/15 bg-transparent px-8 py-3.5 text-sm font-semibold text-slate-300 transition-colors hover:border-white/25 hover:text-white sm:min-w-[140px]"
      >
        Request demo
      </Link>
    </div>
  );
}
