import Link from "next/link";

export function HeroPlatformCTA() {
  return (
    <Link
      href="/product-tour"
      className="inline-flex min-w-[168px] items-center justify-center rounded-md bg-[#007bff] px-8 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_rgba(0,123,255,0.35)] transition-[opacity,box-shadow] hover:opacity-95 hover:shadow-[0_0_32px_rgba(0,123,255,0.5)]"
    >
      Get Started
    </Link>
  );
}
