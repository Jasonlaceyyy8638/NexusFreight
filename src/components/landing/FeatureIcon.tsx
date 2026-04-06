import type { ReactNode } from "react";

type FeatureIconProps = { children: ReactNode };

/** Electric blue glow behind feature icons */
export function FeatureIcon({ children }: FeatureIconProps) {
  return (
    <div className="relative mb-5 inline-flex">
      <span
        className="absolute inset-0 rounded-lg bg-[#007bff] opacity-40 blur-xl"
        aria-hidden
      />
      <span className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-[#007bff]/30 bg-[#007bff]/15 text-[#007bff] shadow-[0_0_24px_rgba(0,123,255,0.35)]">
        {children}
      </span>
    </div>
  );
}
