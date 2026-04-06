import Link from "next/link";
import { MarketingHalfHero } from "@/components/marketing/MarketingHalfHero";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
};

export function MarketingPlaceholder({ eyebrow, title, description }: Props) {
  return (
    <>
      <MarketingHalfHero eyebrow={eyebrow} title={title} description={description} />
      <section className="mx-auto max-w-2xl flex-1 px-6 py-16 sm:py-20">
        <div className="rounded-xl border border-white/[0.08] bg-[#16181A]/80 p-10 text-center sm:p-12">
          <p className="text-sm leading-relaxed text-slate-400">
            We are finishing this experience for beta operators. Early access
            includes the full command center, dispatch workflows, settlements,
            and live map—scoped to your organization with enterprise-grade
            isolation.
          </p>
          <Link
            href="/auth/signup"
            className="mt-8 inline-flex items-center justify-center rounded-md bg-[#007bff] px-8 py-3.5 text-sm font-bold text-white shadow-[0_0_28px_rgba(0,123,255,0.25)] transition-opacity hover:opacity-90"
          >
            Join the Beta
          </Link>
        </div>
      </section>
    </>
  );
}
