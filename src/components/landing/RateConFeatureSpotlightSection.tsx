import Link from "next/link";
import { Poppins, Roboto } from "next/font/google";
import { BadgePercent, EyeOff, FileScan } from "lucide-react";
import { ScannerDemo } from "@/components/landing/ScannerDemo";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const points = [
  {
    title: "Zero-Manual Entry",
    body: "Upload any PDF or Image Rate Confirmation and watch the AI pre-fill pickup, delivery, and load details.",
    Icon: FileScan,
  },
  {
    title: "Invisible Financials",
    body: "Automatically syncs rate data to carrier revenue and driver weekly totals without exposing prices to the driver's view.",
    Icon: EyeOff,
  },
  {
    title: "Automated Dispatcher Profit",
    body: "Real-time back-end calculation of commissions (5%, 7%, 10%) so your net profit is always visible.",
    Icon: BadgePercent,
  },
] as const;

/**
 * Feature spotlight: AI RateCon Scanner — placed after Market Pulse on the home page.
 */
export function RateConFeatureSpotlightSection() {
  return (
    <section
      id="ratecon-ai-spotlight"
      className={`border-t border-white/[0.06] bg-[#09090b] px-6 py-16 sm:py-24 ${roboto.className}`}
      aria-labelledby="ratecon-spotlight-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Interactive scanner demo (screen recording) */}
          <div className="order-2 lg:order-1">
            <ScannerDemo />
          </div>

          {/* Copy */}
          <div className="order-1 lg:order-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#007bff]/90">
              Feature spotlight
            </p>
            <h2
              id="ratecon-spotlight-heading"
              className={`${poppins.className} mt-3 text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-[2.35rem]`}
            >
              Stop Typing. Start Scaling.
            </h2>
            <p className="mt-4 text-base font-medium leading-relaxed text-slate-400 sm:text-lg">
              The Nexus AI RateCon Scanner turns messy paperwork into clean
              payloads in seconds.
            </p>

            <ul className="mt-10 space-y-6">
              {points.map(({ title, body, Icon }) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#5eb0ff]">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <p
                      className={`${poppins.className} text-base font-semibold text-white`}
                    >
                      {title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/auth/signup"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-md bg-[#007bff] px-8 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(0,123,255,0.35)] transition-[opacity,box-shadow] hover:opacity-95 hover:shadow-[0_0_32px_rgba(0,123,255,0.5)]"
                >
                  Grab the Last Beta Spot (45 Days Free)
                </Link>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-200/95">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                    aria-hidden
                  />
                  Beta User
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
