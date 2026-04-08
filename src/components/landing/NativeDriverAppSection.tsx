import Link from "next/link";
import { DriverAppPreview } from "@/components/landing/DriverAppPreview";

export function NativeDriverAppSection() {
  return (
    <section
      className="border-t border-white/[0.06] px-6 py-20 font-[family-name:var(--font-inter)] sm:py-28"
      aria-labelledby="native-driver-app-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <DriverAppPreview />
          </div>
          <div className="order-1 text-center lg:order-2 lg:text-left">
            <h2
              id="native-driver-app-heading"
              className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              The Road Ahead: Native Driver Experience.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400 lg:mx-0">
              Stop chasing drivers with texts. Our upcoming native app will give
              your drivers a one-tap command center. Free push notifications,
              real-time GPS tracking, and instant BOL uploads coming soon.
            </p>
            <div className="mx-auto mt-5 max-w-xl space-y-3 text-left text-slate-400 lg:mx-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                What the driver app is for
              </p>
              <ul className="list-inside list-disc space-y-2 text-base leading-relaxed marker:text-[#3B82F6]">
                <li>
                  <span className="text-slate-300">For drivers on the road:</span>{" "}
                  see assigned loads, accept or decline offers, and view pickup
                  and dropoff details without digging through texts or calls.
                </li>
                <li>
                  <span className="text-slate-300">Fewer check-in calls:</span>{" "}
                  share status, ETAs, and paperwork (including BOL photos) from
                  the cab so the office stays in the loop.
                </li>
                <li>
                  <span className="text-slate-300">Built for the job:</span>{" "}
                  large tap targets, clear next steps, and alerts when something
                  changes — not another bloated “do everything” app.
                </li>
              </ul>
            </div>
            <p className="mx-auto mt-5 max-w-xl text-base font-medium text-slate-300 lg:mx-0">
              <span className="text-white">Coming soon</span>
              {" "}
              on iOS and Android — simple, fast, and built for life on the road.
            </p>
            <div className="mt-10">
              <Link
                href="#lead-capture"
                className="inline-flex min-h-[52px] min-w-[200px] items-center justify-center rounded-md bg-[#3B82F6] px-8 py-3.5 text-base font-bold text-white shadow-[0_0_28px_rgba(59,130,246,0.35)] transition-colors hover:bg-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0E10]"
              >
                Get Beta Access
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
