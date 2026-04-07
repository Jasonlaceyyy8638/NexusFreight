import Link from "next/link";

function IphoneLoadCardMockup() {
  return (
    <div
      className="relative mx-auto w-full max-w-[280px]"
      aria-hidden
    >
      <div className="rounded-[2.75rem] border-[10px] border-slate-900 bg-slate-900 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.85)] ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[2rem] bg-[#0a0b0d]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-7 w-[88px] rounded-full bg-black ring-1 ring-white/10" />
          </div>
          <div className="px-3 pb-8 pt-2">
            <div className="rounded-2xl bg-white p-4 text-left text-slate-900 shadow-lg ring-1 ring-slate-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Active load
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Pickup</p>
                  <p className="mt-0.5 text-sm font-semibold leading-snug">
                    Columbus, OH
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Dropoff</p>
                  <p className="mt-0.5 text-sm font-semibold leading-snug">
                    Nashville, TN
                  </p>
                </div>
              </div>
              <button
                type="button"
                tabIndex={-1}
                className="mt-5 w-full rounded-2xl bg-[#22c55e] py-3.5 text-base font-bold text-white shadow-[0_8px_24px_rgba(34,197,94,0.35)]"
              >
                Accept
              </button>
            </div>
            <p className="mt-4 text-center text-[10px] text-slate-500">
              Preview — not functional
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NativeDriverAppSection() {
  return (
    <section
      className="border-t border-white/[0.06] px-6 py-20 font-[family-name:var(--font-inter)] sm:py-28"
      aria-labelledby="native-driver-app-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <IphoneLoadCardMockup />
          </div>
          <div className="order-1 text-center lg:order-2 lg:text-left">
            <h2
              id="native-driver-app-heading"
              className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              The Road Ahead: Native Driver App.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400 lg:mx-0">
              Stop chasing drivers with texts. Our upcoming native app will give
              your drivers a one-tap command center. Free push notifications,
              real-time GPS tracking, and instant BOL uploads coming soon.
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
