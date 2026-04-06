import Link from "next/link";

type Props = {
  id?: string;
  headline: string;
  bullets: readonly [string, string, string];
  learnMoreHref: string;
  learnMoreLabel?: string;
  /** Alternate layout for visual rhythm on the landing page */
  variant?: "default" | "offset";
};

export function FeatureHighlightSection({
  id,
  headline,
  bullets,
  learnMoreHref,
  learnMoreLabel = "Learn more",
  variant = "default",
}: Props) {
  return (
    <section
      id={id}
      className={`font-sans border-t border-white/[0.06] px-6 py-28 sm:py-32 ${
        variant === "offset" ? "bg-[#0D0E10]" : "bg-[#0a0b0d]"
      }`}
      aria-labelledby={id ? `${id}-hl-heading` : undefined}
    >
      <div
        className={`mx-auto max-w-3xl ${variant === "offset" ? "lg:ml-[12%] lg:mr-auto lg:max-w-2xl" : "lg:mr-[12%] lg:ml-auto lg:max-w-2xl"}`}
      >
        <h2
          id={id ? `${id}-hl-heading` : undefined}
          className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          {headline}
        </h2>
        <ul className="mt-12 space-y-8 text-lg leading-relaxed text-slate-400 sm:text-xl">
          {bullets.map((b) => (
            <li key={b} className="flex gap-4">
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#007bff]"
                aria-hidden
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-16">
          <Link
            href={learnMoreHref}
            className="inline-flex text-sm font-semibold tracking-wide text-slate-300 transition-colors hover:text-blue-500"
          >
            {learnMoreLabel}
            <span className="ml-1.5" aria-hidden>
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
