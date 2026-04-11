"use client";

import { useMemo } from "react";
import { BrokerPacketPanel } from "@/components/dashboard/BrokerPacketPanel";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";

export default function BrokerSetupPacketPage() {
  const { carriers, selectedCarrierId, isCarrierOrg } = useDashboardData();

  const carrier = useMemo(() => {
    if (selectedCarrierId) {
      return carriers.find((c) => c.id === selectedCarrierId) ?? carriers[0];
    }
    return carriers[0];
  }, [carriers, selectedCarrierId]);

  if (!isCarrierOrg) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <p className="text-lg font-semibold text-white">Broker setup packet</p>
        <p className="mt-2 text-sm text-slate-400">
          Open a carrier from <strong className="text-slate-200">Carriers</strong> and
          use the <strong className="text-slate-200">Broker setup packet</strong> tab on
          that carrier&apos;s profile. Dispatchers manage one packet per carrier.
        </p>
      </div>
    );
  }

  if (!carrier) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-sm text-slate-400 sm:px-6">
        Add a carrier to your fleet to manage the broker setup packet.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <BrokerPacketPanel
        carrierId={carrier.id}
        carrierName={carrier.name}
        mcNumber={carrier.mc_number}
      />
    </div>
  );
}
