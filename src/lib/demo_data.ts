import {
  computeDeadheadPayCents,
  computeDispatcherCommissionCents,
  computeDriverTotalPayCents,
  computeLoadedDriverPayCents,
} from "@/lib/calculations";
import type {
  Carrier,
  Driver,
  DriverPayStructure,
  EldConnection,
  Load,
  LoadStatus,
  OrgType,
  Truck,
} from "@/types/database";

export const DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001";
const C1 = "00000000-0000-4000-8000-000000000011";
const C2 = "00000000-0000-4000-8000-000000000012";
const C_FLEET = "00000000-0000-4000-8000-000000000015";

const now = () => new Date().toISOString();
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

export type InteractiveDemoVariant = "dispatcher" | "carrier";

export type InteractiveDemoBundle = {
  orgId: string;
  orgType: OrgType;
  carriers: Carrier[];
  drivers: Driver[];
  trucks: Truck[];
  loads: Load[];
  eldConnections: EldConnection[];
  defaultSelectedCarrierId: string | null;
};

const dispatcherCarriers: Carrier[] = [
  {
    id: C1,
    org_id: DEMO_ORG_ID,
    name: "Summit Line Transport",
    mc_number: "884521",
    dot_number: "1234567",
    is_active_authority: true,
    fee_percent: 12,
    service_fee_type: "percent",
    service_fee_flat_cents: null,
    contact_email: "ops@summitline.example",
    eld_handshake_completed_at: daysAgo(14),
  },
  {
    id: C2,
    org_id: DEMO_ORG_ID,
    name: "Continental Haul LLC",
    mc_number: "771203",
    dot_number: "2345678",
    is_active_authority: true,
    fee_percent: 10,
    service_fee_type: "flat",
    service_fee_flat_cents: 25000,
    contact_email: "dispatch@continental.example",
    eld_handshake_completed_at: daysAgo(7),
  },
];

const carrierOnly: Carrier[] = [
  {
    id: C_FLEET,
    org_id: DEMO_ORG_ID,
    name: "Prairie Run Logistics",
    mc_number: "612884",
    dot_number: "3489012",
    is_active_authority: true,
    fee_percent: 0,
    service_fee_type: "percent",
    service_fee_flat_cents: null,
    contact_email: "fleet@prairierun.example",
  },
];

const DEFAULT_DRIVER_PAY = {
  pay_structure: "percent_gross" as DriverPayStructure,
  pay_percent_of_gross: 30,
  pay_cpm_cents: 70,
};

function attachPayrollDemo(
  base: {
    id: string;
    org_id: string;
    carrier_id: string;
    driver_id: string | null;
    origin: string;
    destination: string;
    rate_cents: number;
    status: LoadStatus;
    ratecon_storage_path: string | null;
    dispatched_at: string | null;
    delivered_at: string | null;
  },
  carrier: Carrier | undefined,
  driver: Driver | undefined,
  idx: number,
  isAgency: boolean
): Load {
  const payDead = idx % 4 === 0;
  const deadheadMiles = payDead ? 90 + (idx % 30) : 0;
  const loadedMiles = 300 + (idx % 80);
  const dhRate = 50;
  const structure = (driver?.pay_structure ??
    "percent_gross") as DriverPayStructure;
  const deadheadPay = computeDeadheadPayCents({
    payDeadhead: payDead,
    deadheadMiles,
    deadheadRateCpmCents: dhRate,
  });
  const loadedPay = computeLoadedDriverPayCents({
    payStructure: structure,
    rateCents: base.rate_cents,
    loadedMiles,
    payPercentOfGross: driver?.pay_percent_of_gross ?? 30,
    payCpmCents: driver?.pay_cpm_cents ?? 70,
  });
  const total = computeDriverTotalPayCents(loadedPay, deadheadPay);
  const disp =
    isAgency && base.status === "delivered" && carrier
      ? computeDispatcherCommissionCents({
          serviceFeeType: carrier.service_fee_type ?? "percent",
          rateCents: base.rate_cents,
          feePercent: carrier.fee_percent,
          feeFlatCents: carrier.service_fee_flat_cents,
        })
      : null;
  return {
    ...base,
    pay_deadhead: payDead,
    deadhead_rate_cpm_cents: payDead ? dhRate : null,
    deadhead_miles: payDead ? deadheadMiles : null,
    loaded_miles: loadedMiles,
    deadhead_pay_cents: deadheadPay,
    loaded_driver_pay_cents: loadedPay,
    driver_total_pay_cents: total,
    dispatcher_commission_cents: disp,
  };
}

function dispatcherDrivers(): Driver[] {
  return [
    {
      id: "00000000-0000-4000-8000-000000000021",
      org_id: DEMO_ORG_ID,
      carrier_id: C1,
      full_name: "Jordan Ellis",
      phone: "+15551234001",
      contact_email: "j.ellis@example.com",
      status: "active",
      emergency_contact_name: "Pat Ellis",
      emergency_contact_phone: "+15559991001",
      emergency_contact_relationship: "Spouse",
      ...DEFAULT_DRIVER_PAY,
    },
    {
      id: "00000000-0000-4000-8000-000000000022",
      org_id: DEMO_ORG_ID,
      carrier_id: C1,
      full_name: "Riley Chen",
      phone: "+15551234002",
      contact_email: "r.chen@example.com",
      status: "on_vacation",
      emergency_contact_name: "Morgan Chen",
      emergency_contact_phone: "+15559991002",
      emergency_contact_relationship: "Sibling",
      ...DEFAULT_DRIVER_PAY,
      pay_structure: "cpm",
      pay_cpm_cents: 68,
    },
    {
      id: "00000000-0000-4000-8000-000000000023",
      org_id: DEMO_ORG_ID,
      carrier_id: C1,
      full_name: "Marcus Webb",
      phone: "+15551234003",
      contact_email: null,
      status: "terminated",
      emergency_contact_name: "Dana Webb",
      emergency_contact_phone: "+15559991003",
      emergency_contact_relationship: "Parent",
      ...DEFAULT_DRIVER_PAY,
    },
    {
      id: "00000000-0000-4000-8000-000000000024",
      org_id: DEMO_ORG_ID,
      carrier_id: C2,
      full_name: "Sam Ortiz",
      phone: "+15551234004",
      contact_email: "s.ortiz@example.com",
      status: "active",
      emergency_contact_name: "Chris Ortiz",
      emergency_contact_phone: "+15559991004",
      emergency_contact_relationship: "Spouse",
      ...DEFAULT_DRIVER_PAY,
    },
    {
      id: "00000000-0000-4000-8000-000000000025",
      org_id: DEMO_ORG_ID,
      carrier_id: C2,
      full_name: "Taylor Brooks",
      phone: "+15551234005",
      contact_email: null,
      status: "active",
      emergency_contact_name: "Jamie Brooks",
      emergency_contact_phone: "+15559991005",
      emergency_contact_relationship: "Partner",
      ...DEFAULT_DRIVER_PAY,
    },
    {
      id: "00000000-0000-4000-8000-000000000026",
      org_id: DEMO_ORG_ID,
      carrier_id: C2,
      full_name: "Alex Kim",
      phone: "+15551234006",
      contact_email: "a.kim@example.com",
      status: "on_vacation",
      emergency_contact_name: "Lee Kim",
      emergency_contact_phone: "+15559991006",
      emergency_contact_relationship: "Parent",
      ...DEFAULT_DRIVER_PAY,
    },
  ];
}

function carrierDrivers(): Driver[] {
  return [
    {
      id: "00000000-0000-4000-8000-000000000031",
      org_id: DEMO_ORG_ID,
      carrier_id: C_FLEET,
      full_name: "Jordan Ellis",
      phone: "+15551234001",
      contact_email: "j.ellis@example.com",
      status: "active",
      emergency_contact_name: "Pat Ellis",
      emergency_contact_phone: "+15559991001",
      emergency_contact_relationship: "Spouse",
      ...DEFAULT_DRIVER_PAY,
    },
    {
      id: "00000000-0000-4000-8000-000000000032",
      org_id: DEMO_ORG_ID,
      carrier_id: C_FLEET,
      full_name: "Riley Chen",
      phone: "+15551234002",
      contact_email: "r.chen@example.com",
      status: "active",
      emergency_contact_name: "Morgan Chen",
      emergency_contact_phone: "+15559991002",
      emergency_contact_relationship: "Sibling",
      ...DEFAULT_DRIVER_PAY,
      pay_structure: "cpm",
      pay_cpm_cents: 72,
    },
    {
      id: "00000000-0000-4000-8000-000000000033",
      org_id: DEMO_ORG_ID,
      carrier_id: C_FLEET,
      full_name: "Marcus Webb",
      phone: "+15551234003",
      contact_email: null,
      status: "on_vacation",
      emergency_contact_name: "Dana Webb",
      emergency_contact_phone: "+15559991003",
      emergency_contact_relationship: "Parent",
      ...DEFAULT_DRIVER_PAY,
    },
    {
      id: "00000000-0000-4000-8000-000000000034",
      org_id: DEMO_ORG_ID,
      carrier_id: C_FLEET,
      full_name: "Sam Ortiz",
      phone: "+15551234004",
      contact_email: "s.ortiz@example.com",
      status: "active",
      emergency_contact_name: "Chris Ortiz",
      emergency_contact_phone: "+15559991004",
      emergency_contact_relationship: "Spouse",
      ...DEFAULT_DRIVER_PAY,
    },
  ];
}

/** Hubs: Chicago, Dallas, Atlanta, Denver, Kansas City — realistic demo pings */
function dispatcherTrucks(): Truck[] {
  return [
    {
      id: "00000000-0000-4000-8000-000000000041",
      org_id: DEMO_ORG_ID,
      carrier_id: C1,
      unit_number: "S-104",
      last_lat: 41.8781,
      last_lng: -87.6298,
      last_ping_at: now(),
      fleet_status: "active",
    },
    {
      id: "00000000-0000-4000-8000-000000000042",
      org_id: DEMO_ORG_ID,
      carrier_id: C1,
      unit_number: "S-105",
      last_lat: 41.85,
      last_lng: -87.65,
      last_ping_at: daysAgo(0),
      fleet_status: "active",
    },
    {
      id: "00000000-0000-4000-8000-000000000043",
      org_id: DEMO_ORG_ID,
      carrier_id: C1,
      unit_number: "S-106",
      last_lat: 39.7392,
      last_lng: -104.9903,
      last_ping_at: now(),
      fleet_status: "maintenance",
    },
    {
      id: "00000000-0000-4000-8000-000000000044",
      org_id: DEMO_ORG_ID,
      carrier_id: C2,
      unit_number: "C-220",
      last_lat: 32.7767,
      last_lng: -96.797,
      last_ping_at: now(),
      fleet_status: "active",
    },
    {
      id: "00000000-0000-4000-8000-000000000045",
      org_id: DEMO_ORG_ID,
      carrier_id: C2,
      unit_number: "C-221",
      last_lat: 33.749,
      last_lng: -84.388,
      last_ping_at: daysAgo(0),
      fleet_status: "active",
    },
  ];
}

function carrierTrucks(): Truck[] {
  return [
    {
      id: "00000000-0000-4000-8000-000000000051",
      org_id: DEMO_ORG_ID,
      carrier_id: C_FLEET,
      unit_number: "PR-01",
      last_lat: 41.8781,
      last_lng: -87.6298,
      last_ping_at: now(),
      fleet_status: "active",
    },
    {
      id: "00000000-0000-4000-8000-000000000052",
      org_id: DEMO_ORG_ID,
      carrier_id: C_FLEET,
      unit_number: "PR-02",
      last_lat: 32.7767,
      last_lng: -96.797,
      last_ping_at: now(),
      fleet_status: "active",
    },
    {
      id: "00000000-0000-4000-8000-000000000053",
      org_id: DEMO_ORG_ID,
      carrier_id: C_FLEET,
      unit_number: "PR-03",
      last_lat: 39.0997,
      last_lng: -94.5786,
      last_ping_at: daysAgo(0),
      fleet_status: "maintenance",
    },
  ];
}

function dispatcherLoads(drivers: Driver[]): Load[] {
  const loadIds = [
    "00000000-0000-4000-8000-000000000101",
    "00000000-0000-4000-8000-000000000102",
    "00000000-0000-4000-8000-000000000103",
    "00000000-0000-4000-8000-000000000104",
    "00000000-0000-4000-8000-000000000105",
    "00000000-0000-4000-8000-000000000106",
    "00000000-0000-4000-8000-000000000107",
    "00000000-0000-4000-8000-000000000108",
    "00000000-0000-4000-8000-000000000109",
    "00000000-0000-4000-8000-000000000110",
    "00000000-0000-4000-8000-000000000111",
    "00000000-0000-4000-8000-000000000112",
    "00000000-0000-4000-8000-000000000113",
    "00000000-0000-4000-8000-000000000114",
    "00000000-0000-4000-8000-000000000115",
  ];
  const lanes: Array<{
    origin: string;
    destination: string;
    rate: number;
    carrier: string;
    status: LoadStatus;
    driverIdx?: number;
  }> = [
    { origin: "Chicago, IL", destination: "Columbus, OH", rate: 4200, carrier: C1, status: "in_transit", driverIdx: 0 },
    { origin: "Dallas, TX", destination: "Atlanta, GA", rate: 5100, carrier: C1, status: "draft" },
    { origin: "Denver, CO", destination: "Kansas City, MO", rate: 3800, carrier: C2, status: "delivered", driverIdx: 3 },
    { origin: "Phoenix, AZ", destination: "El Paso, TX", rate: 2900, carrier: C2, status: "dispatched", driverIdx: 4 },
    { origin: "Memphis, TN", destination: "Nashville, TN", rate: 1850, carrier: C1, status: "draft" },
    { origin: "Los Angeles, CA", destination: "Las Vegas, NV", rate: 2200, carrier: C2, status: "in_transit", driverIdx: 5 },
    { origin: "Indianapolis, IN", destination: "Detroit, MI", rate: 1650, carrier: C1, status: "delivered", driverIdx: 1 },
    { origin: "Houston, TX", destination: "New Orleans, LA", rate: 2100, carrier: C2, status: "cancelled" },
    { origin: "Seattle, WA", destination: "Portland, OR", rate: 1950, carrier: C1, status: "draft" },
    { origin: "Miami, FL", destination: "Tampa, FL", rate: 1400, carrier: C2, status: "in_transit", driverIdx: 4 },
    { origin: "Salt Lake City, UT", destination: "Boise, ID", rate: 2400, carrier: C1, status: "dispatched", driverIdx: 2 },
    { origin: "Charlotte, NC", destination: "Richmond, VA", rate: 1750, carrier: C2, status: "delivered" },
    { origin: "Omaha, NE", destination: "Des Moines, IA", rate: 1550, carrier: C1, status: "draft" },
    { origin: "Baltimore, MD", destination: "Philadelphia, PA", rate: 1300, carrier: C2, status: "in_transit", driverIdx: 5 },
    { origin: "St. Louis, MO", destination: "Chicago, IL", rate: 1600, carrier: C1, status: "delivered", driverIdx: 0 },
  ];

  return lanes.map((L, i) => {
    const driver =
      L.driverIdx !== undefined ? drivers[L.driverIdx] : undefined;
    const disp =
      L.status === "dispatched" || L.status === "in_transit" || L.status === "delivered"
        ? daysAgo(3 - (i % 4))
        : null;
    const del = L.status === "delivered" ? daysAgo(1) : null;
    const carrier = dispatcherCarriers.find((c) => c.id === L.carrier);
    const base = {
      id: loadIds[i]!,
      org_id: DEMO_ORG_ID,
      carrier_id: L.carrier,
      driver_id: driver?.id ?? null,
      origin: L.origin,
      destination: L.destination,
      rate_cents: L.rate * 100,
      status: L.status,
      ratecon_storage_path: i % 4 === 0 ? `demo/${L.carrier}/rc-${i}.pdf` : null,
      dispatched_at: disp,
      delivered_at: del,
    };
    return attachPayrollDemo(base, carrier, driver, i, true);
  });
}

function carrierLoads(drivers: Driver[]): Load[] {
  const loadIds = [
    "00000000-0000-4000-8000-000000000201",
    "00000000-0000-4000-8000-000000000202",
    "00000000-0000-4000-8000-000000000203",
    "00000000-0000-4000-8000-000000000204",
    "00000000-0000-4000-8000-000000000205",
    "00000000-0000-4000-8000-000000000206",
    "00000000-0000-4000-8000-000000000207",
    "00000000-0000-4000-8000-000000000208",
    "00000000-0000-4000-8000-000000000209",
    "00000000-0000-4000-8000-000000000210",
    "00000000-0000-4000-8000-000000000211",
    "00000000-0000-4000-8000-000000000212",
  ];
  const lanes = [
    { o: "Chicago, IL", d: "Columbus, OH", r: 4200, s: "in_transit" as const, di: 0 },
    { o: "Dallas, TX", d: "Houston, TX", r: 1850, s: "draft" as const },
    { o: "Denver, CO", d: "Kansas City, MO", r: 3200, s: "delivered" as const, di: 1 },
    { o: "Atlanta, GA", d: "Miami, FL", r: 2400, s: "dispatched" as const, di: 2 },
    { o: "Phoenix, AZ", d: "Los Angeles, CA", r: 2800, s: "in_transit" as const, di: 0 },
    { o: "Nashville, TN", d: "Memphis, TN", r: 1200, s: "draft" as const },
    { o: "Indianapolis, IN", d: "Detroit, MI", r: 1650, s: "delivered" as const, di: 3 },
    { o: "Seattle, WA", d: "Portland, OR", r: 1950, s: "draft" as const },
    { o: "St. Louis, MO", d: "Chicago, IL", r: 1600, s: "in_transit" as const, di: 1 },
    { o: "Salt Lake City, UT", d: "Boise, ID", r: 2200, s: "cancelled" as const },
    { o: "Charlotte, NC", d: "Richmond, VA", r: 1750, s: "delivered" as const, di: 2 },
    { o: "Omaha, NE", d: "Des Moines, IA", r: 1550, s: "draft" as const },
  ];
  return lanes.map((L, i) => {
    const uuid = loadIds[i]!;
    const driver = L.di !== undefined ? drivers[L.di] : undefined;
    const disp =
      L.s === "dispatched" || L.s === "in_transit" || L.s === "delivered"
        ? daysAgo(2)
        : null;
    const del = L.s === "delivered" ? daysAgo(1) : null;
    const carrier = carrierOnly[0];
    const base = {
      id: uuid,
      org_id: DEMO_ORG_ID,
      carrier_id: C_FLEET,
      driver_id: driver?.id ?? null,
      origin: L.o,
      destination: L.d,
      rate_cents: L.r * 100,
      status: L.s,
      ratecon_storage_path: i % 3 === 0 ? `demo/fleet/rc-${i}.pdf` : null,
      dispatched_at: disp,
      delivered_at: del,
    };
    return attachPayrollDemo(base, carrier, driver, i, false);
  });
}

function dispatcherEld(): EldConnection[] {
  return [
    {
      id: "00000000-0000-4000-8000-000000000061",
      org_id: DEMO_ORG_ID,
      carrier_id: C1,
      provider: "samsara",
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000062",
      org_id: DEMO_ORG_ID,
      carrier_id: C2,
      provider: "motive",
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
    },
  ];
}

function carrierEld(): EldConnection[] {
  return [
    {
      id: "00000000-0000-4000-8000-000000000063",
      org_id: DEMO_ORG_ID,
      carrier_id: C_FLEET,
      provider: "geotab",
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
    },
  ];
}

export function getInteractiveDemoBundle(
  variant: InteractiveDemoVariant
): InteractiveDemoBundle {
  if (variant === "carrier") {
    const carriers = carrierOnly;
    const drivers = carrierDrivers();
    const trucks = carrierTrucks();
    const loads = carrierLoads(drivers);
    return {
      orgId: DEMO_ORG_ID,
      orgType: "Carrier",
      carriers,
      drivers,
      trucks,
      loads,
      eldConnections: carrierEld(),
      defaultSelectedCarrierId: C_FLEET,
    };
  }

  const carriers = dispatcherCarriers;
  const drivers = dispatcherDrivers();
  const trucks = dispatcherTrucks();
  const loads = dispatcherLoads(drivers);
  return {
    orgId: DEMO_ORG_ID,
    orgType: "Agency",
    carriers,
    drivers,
    trucks,
    loads,
    eldConnections: dispatcherEld(),
    defaultSelectedCarrierId: C1,
  };
}

/** Legacy static exports for server pages & env-offline demo (dispatcher portfolio). */
const _dispatcher = getInteractiveDemoBundle("dispatcher");
export const demoCarriers = _dispatcher.carriers;
export const demoDrivers = _dispatcher.drivers;
export const demoTrucks = _dispatcher.trucks;
export const demoLoads = _dispatcher.loads;
export const demoEld = _dispatcher.eldConnections;
