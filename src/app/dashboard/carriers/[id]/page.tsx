import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CarrierProfileBackNav } from "@/components/dashboard/CarrierProfileBackNav";
import { CarrierProfileClient } from "@/components/dashboard/CarrierProfileClient";
import {
  demoCarriers,
  demoDrivers,
  demoEld,
  demoLoads,
  demoTrucks,
} from "@/lib/dashboard/demo-data";
import { getInteractiveDemoBundle } from "@/lib/demo_data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Carrier, Driver, EldConnection, Load, Truck } from "@/types/database";

type PageProps = { params: Promise<{ id: string }> };

export default async function CarrierProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  let carrier: Carrier | null = null;
  let drivers: Driver[] = [];
  let loads: Load[] = [];
  let trucks: Truck[] = [];
  let eldConnections: EldConnection[] = [];

  if (supabase) {
    const { data: c } = await supabase
      .from("carriers")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    carrier = c as Carrier | null;
    if (carrier) {
      const [dRes, lRes, tRes, eRes] = await Promise.all([
        supabase.from("drivers").select("*").eq("carrier_id", id),
        supabase.from("loads").select("*").eq("carrier_id", id),
        supabase.from("trucks").select("*").eq("carrier_id", id),
        supabase.from("eld_connections").select("*").eq("carrier_id", id),
      ]);
      drivers = (dRes.data as Driver[]) ?? [];
      loads = (lRes.data as Load[]) ?? [];
      trucks = (tRes.data as Truck[]) ?? [];
      eldConnections = (eRes.data as EldConnection[]) ?? [];
    }
  }

  if (!carrier) {
    const jar = await cookies();
    const dm = jar.get("nexus_demo_mode")?.value;
    if (dm === "dispatcher" || dm === "carrier") {
      const b = getInteractiveDemoBundle(dm);
      carrier = b.carriers.find((c) => c.id === id) ?? null;
      if (carrier) {
        drivers = b.drivers.filter((d) => d.carrier_id === id);
        loads = b.loads.filter((l) => l.carrier_id === id);
        trucks = b.trucks.filter((t) => t.carrier_id === id);
        eldConnections = b.eldConnections.filter((e) => e.carrier_id === id);
      }
    }
  }

  if (!carrier) {
    carrier = demoCarriers.find((c) => c.id === id) ?? null;
    if (carrier) {
      drivers = demoDrivers.filter((d) => d.carrier_id === id);
      loads = demoLoads.filter((l) => l.carrier_id === id);
      trucks = demoTrucks.filter((t) => t.carrier_id === id);
      eldConnections = demoEld.filter((e) => e.carrier_id === id);
    }
  }

  if (!carrier) notFound();

  return (
    <div className="min-h-full bg-[#1A1C1E] text-white">
      <header className="border-b border-white/10 bg-[#1A1C1E]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <CarrierProfileBackNav />
        </div>
      </header>
      <CarrierProfileClient
        carrier={carrier}
        drivers={drivers}
        loads={loads}
        trucks={trucks}
        eldConnections={eldConnections}
      />
    </div>
  );
}
