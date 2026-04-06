/**
 * Fixed beta + support notice (root layout).
 * Height is fixed at `h-10` (2.5rem) to match `pt-10` on the main content wrapper
 * so fixed sidebars can use `top-10` / `h-[calc(100vh-2.5rem)]` without overlap.
 */
export function BetaSupportBanner() {
  return (
    <div
      className="fixed left-0 right-0 top-0 z-[100] flex h-10 items-center justify-center overflow-hidden border-b border-white/[0.08] bg-[#121416]/95 px-4 text-center text-[11px] font-medium leading-tight text-slate-400 backdrop-blur-md sm:text-xs"
      role="status"
    >
      <span className="line-clamp-1 max-w-4xl">
        NexusFreight Beta is Live. Need help? Contact our 24/7 support team at{" "}
        <a
          href="mailto:info@nexusfreight.tech"
          className="text-slate-200 underline decoration-white/20 underline-offset-2 transition-colors hover:text-[#007bff] hover:decoration-[#007bff]/50"
        >
          info@nexusfreight.tech
        </a>
      </span>
    </div>
  );
}
