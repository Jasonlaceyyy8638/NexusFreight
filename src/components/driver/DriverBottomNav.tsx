"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Truck, UserRound } from "lucide-react";

const items = [
  { href: "/driver/dashboard", label: "Active load", icon: Truck },
  { href: "/driver/history", label: "History", icon: History },
  { href: "/driver/profile", label: "Profile", icon: UserRound },
] as const;

export function DriverBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#121416]/95 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-md"
      aria-label="Driver navigation"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around gap-1 px-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/driver/dashboard"
              ? pathname === "/driver" || pathname.startsWith("/driver/dashboard")
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex min-w-0 flex-1 justify-center">
              <Link
                href={href}
                className={`flex w-full max-w-[120px] flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                  active
                    ? "text-[#007bff]"
                    : "text-slate-500 hover:text-slate-300"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className="h-6 w-6 shrink-0"
                  strokeWidth={active ? 2.25 : 2}
                  aria-hidden
                />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
