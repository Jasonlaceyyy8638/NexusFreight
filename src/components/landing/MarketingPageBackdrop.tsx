/** Shared dark canvas for public marketing-style pages (landing, help). */
export function MarketingPageBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[#0D0E10]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(circle at center, #1A1C1E 0%, #0D0E10 100%)",
        }}
        aria-hidden
      />
    </>
  );
}
