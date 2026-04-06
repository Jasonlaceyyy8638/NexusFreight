type Props = {
  eyebrow: string;
  title: string;
  description?: string;
};

/** Compact hero for marketing sub-pages (~half the visual weight of the home hero). */
export function MarketingHalfHero({ eyebrow, title, description }: Props) {
  return (
    <header className="border-b border-white/[0.06] px-6 pt-10 pb-8 sm:pt-14 sm:pb-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[2rem] sm:leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            {description}
          </p>
        ) : null}
      </div>
    </header>
  );
}
