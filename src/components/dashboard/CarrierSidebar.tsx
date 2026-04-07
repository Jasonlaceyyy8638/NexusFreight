"use client";

import {
  Banknote,
  ClipboardList,
  FileText,
  Headset,
  LayoutDashboard,
  LogOut,
  Map,
  Plug,
  Settings,
  ShieldCheck,
  Truck,
  UserCog,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SidebarPwaInstallButton } from "@/components/pwa/SidebarPwaInstallButton";
import { NexusFreightLogo } from "@/components/marketing/NexusFreightLogo";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/drivers", label: "Drivers", icon: UserCircle2 },
  { href: "/dashboard/map", label: "Live Map", icon: Map },
  { href: "/dashboard/loads", label: "Loads", icon: ClipboardList },
  { href: "/dashboard/fleet", label: "Drivers & Trucks", icon: Truck },
  { href: "/dashboard/settlements", label: "Payroll & Reports", icon: FileText },
  {
    href: "/dashboard/driver-settlements",
    label: "Driver settlements",
    icon: Banknote,
  },
  { href: "/dashboard/team", label: "Internal Team", icon: Users },
  { href: "/dashboard/team-management", label: "Team management", icon: UserCog },
  {
    href: "/dashboard/support-resources",
    label: "Support & Resources",
    icon: Headset,
  },
  {
    href: "/dashboard/documents",
    label: "Compliance & Documents",
    icon: ShieldCheck,
  },
  {
    href: "/dashboard/settings/integrations",
    label: "ELD & telematics",
    icon: Plug,
  },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: true },
];

function linkActive(pathname: string, href: string, exact?: boolean) {
  if (exact) {
    return pathname === href || pathname === `${href}/`;
  }
  if (pathname === href || pathname === `${href}/`) return true;
  return pathname.startsWith(`${href}/`);
}

export function CarrierSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) {
        setDisplayName("Guest");
        setEmail("Demo mode");
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) {
        if (!cancelled) {
          setDisplayName("Signed out");
          setEmail("");
        }
        return;
      }
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) {
        const name =
          (profile as { full_name?: string } | null)?.full_name?.trim() || "";
        setDisplayName(name || user.email?.split("@")[0] || "User");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }, [supabase, router]);

  return (
    <aside className="fixed left-0 top-10 z-[80] flex h-[calc(100dvh-2.5rem)] w-64 flex-col border-r border-white/10 bg-[#1A1C1E] text-white">
      <div className="shrink-0 border-b border-white/10 px-4 py-4">
        <Link href="/dashboard" className="block rounded-xl outline-none ring-offset-2 ring-offset-[#1A1C1E] focus-visible:ring-2 focus-visible:ring-[#3B82F6]/50">
          <NexusFreightLogo className="h-8 w-auto" />
          <span className="mt-0.5 block text-[10px] font-semibold tracking-[0.22em] text-emerald-400/90">
            FLEET COMMAND
          </span>
        </Link>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-4">
        {nav.map(({ href, label, icon: Icon, exact }) => {
          const active = linkActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#007bff]/18 text-white shadow-[inset_3px_0_0_0_#007bff]"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[#3395ff]" : "text-slate-500"}`}
                strokeWidth={2}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <SidebarPwaInstallButton />
        <div className="rounded-lg border border-white/10 bg-[#16181A]/90 px-3 py-2.5">
          <p className="truncate text-xs font-semibold text-slate-200">
            {displayName}
          </p>
          <p className="truncate text-[11px] text-slate-500">{email || "—"}</p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-red-500/40 hover:bg-red-950/30 hover:text-red-200"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
            Log out
          </button>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-slate-600">
          <Link href="/help" className="hover:text-slate-400">
            Help
          </Link>
          <a href="mailto:info@nexusfreight.tech" className="hover:text-slate-400">
            Support
          </a>
          <Link href="/" className="hover:text-slate-400">
            Site
          </Link>
        </div>
      </div>
    </aside>
  );
}
