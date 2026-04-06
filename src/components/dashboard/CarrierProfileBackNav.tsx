"use client";

import Link from "next/link";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";

export function CarrierProfileBackNav() {
  const { isCarrierOrg } = useDashboardData();

  return (
    <Link
      href={isCarrierOrg ? "/dashboard/team" : "/dashboard/carriers"}
      className="text-sm text-slate-400 transition-colors hover:text-white"
    >
      {isCarrierOrg ? "← Internal Team" : "← Carriers"}
    </Link>
  );
}
