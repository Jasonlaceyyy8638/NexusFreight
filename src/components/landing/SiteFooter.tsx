import Link from "next/link";
import { NexusFreightLogo } from "@/components/marketing/NexusFreightLogo";

const product = [
  { label: "Command Center", href: "/product/command-center" },
  { label: "Dispatch", href: "/product/dispatch" },
  { label: "Settlements", href: "/product/settlements" },
  { label: "Platform", href: "/product/platform" },
];

const resources = [
  { label: "Guides & articles", href: "/resources" },
  { label: "Product Tour", href: "/product-tour" },
  { label: "ELD Integrations", href: "/resources/eld-integrations" },
  { label: "Live Map", href: "/resources/live-map" },
  { label: "Security & RLS", href: "/resources/security" },
  { label: "Support", href: "/resources/support" },
];

const company = [
  { label: "About", href: "/company/about" },
  { label: "Careers", href: "/company/careers" },
  {
    label: "Contact",
    href: "mailto:info@nexusfreight.tech",
    external: true as const,
  },
  { label: "Compliance", href: "/company/compliance" },
];

const legal = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Data Processing", href: "/legal/data-processing" },
];

function LinkItem({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  const className =
    "text-sm text-slate-400 transition-colors hover:text-blue-500";
  if (external || href.startsWith("mailto:")) {
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-[#1A1C1E] px-4 pb-[max(5rem,calc(env(safe-area-inset-bottom,0px)+3.5rem))] pt-20 sm:px-6 sm:pb-[max(6rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] sm:pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14">
          <Link href="/" className="inline-flex rounded-xl outline-none ring-offset-2 ring-offset-[#1A1C1E] transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50">
            <NexusFreightLogo className="h-9 w-auto sm:h-10" />
          </Link>
        </div>
        <div className="grid gap-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Product
            </p>
            <ul className="mt-6 space-y-3">
              {product.map((l) => (
                <li key={l.label}>
                  <LinkItem href={l.href} label={l.label} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Resources
            </p>
            <ul className="mt-6 space-y-3">
              {resources.map((l) => (
                <li key={l.label}>
                  <LinkItem href={l.href} label={l.label} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Company
            </p>
            <ul className="mt-6 space-y-3">
              {company.map((l) => (
                <li key={l.label}>
                  <LinkItem
                    href={l.href}
                    label={l.label}
                    external={"external" in l ? l.external : undefined}
                  />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Legal
            </p>
            <ul className="mt-6 space-y-3">
              {legal.map((l) => (
                <li key={l.label}>
                  <LinkItem href={l.href} label={l.label} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-20 border-t border-white/[0.06] pt-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <a
              href="mailto:info@nexusfreight.tech"
              className="text-sm text-slate-400 transition-colors hover:text-blue-500"
            >
              info@nexusfreight.tech
            </a>
            <p className="text-xs text-slate-500">
              © 2026 NexusFreight. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
