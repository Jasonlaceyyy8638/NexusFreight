/** Payroll & commission math (cents, miles). */

import type { DriverPayStructure, ServiceFeeType } from "@/types/database";

export type { DriverPayStructure, ServiceFeeType };

export type DispatcherCommissionInput = {
  serviceFeeType: ServiceFeeType;
  /** Linehaul gross for the load (cents). */
  rateCents: number;
  /** Used when serviceFeeType === 'percent'. */
  feePercent: number;
  /** Used when serviceFeeType === 'flat' — per load (cents). */
  feeFlatCents: number | null | undefined;
};

/**
 * Dispatcher / brokerage commission for one load (typically when delivered).
 */
export function computeDispatcherCommissionCents(
  input: DispatcherCommissionInput
): number {
  const { serviceFeeType, rateCents, feePercent, feeFlatCents } = input;
  if (serviceFeeType === "flat") {
    const flat = Math.max(0, Math.round(Number(feeFlatCents ?? 0)));
    return flat;
  }
  const pct = Math.max(0, Math.min(100, Number(feePercent)));
  return Math.round((rateCents * pct) / 100);
}

export type LoadedDriverPayInput = {
  payStructure: DriverPayStructure;
  /** Load gross linehaul (cents). */
  rateCents: number;
  /** Loaded miles (linehaul). */
  loadedMiles: number;
  /** For percent_gross: e.g. 30 means 30% of gross. */
  payPercentOfGross: number;
  /** For cpm: cents per loaded mile. */
  payCpmCents: number;
};

/** Driver pay attributable to loaded miles / gross (excludes deadhead). */
export function computeLoadedDriverPayCents(input: LoadedDriverPayInput): number {
  const miles = Math.max(0, Number(input.loadedMiles));
  if (input.payStructure === "percent_gross") {
    const p = Math.max(0, Math.min(100, Number(input.payPercentOfGross)));
    return Math.round((input.rateCents * p) / 100);
  }
  const cpm = Math.max(0, Math.round(Number(input.payCpmCents)));
  return Math.round(miles * cpm);
}

export type DeadheadPayInput = {
  payDeadhead: boolean;
  deadheadMiles: number;
  /** Cents per mile for deadhead (e.g. 50 = $0.50/mi). */
  deadheadRateCpmCents: number;
};

export function computeDeadheadPayCents(input: DeadheadPayInput): number {
  if (!input.payDeadhead) return 0;
  const miles = Math.max(0, Number(input.deadheadMiles));
  const cpm = Math.max(0, Math.round(Number(input.deadheadRateCpmCents)));
  return Math.round(miles * cpm);
}

export function computeDriverTotalPayCents(
  loadedPayCents: number,
  deadheadPayCents: number
): number {
  return Math.max(0, Math.round(loadedPayCents) + Math.round(deadheadPayCents));
}

/** Effective loaded miles for display when unknown. */
export function milesOrZero(n: number | null | undefined): number {
  if (n == null || Number.isNaN(Number(n))) return 0;
  return Math.max(0, Number(n));
}

export type CarrierFeeLike = {
  service_fee_type?: ServiceFeeType | null;
  fee_percent: number;
  service_fee_flat_cents?: number | null;
};

export type LoadCommissionLike = {
  status: string;
  rate_cents: number;
  dispatcher_commission_cents?: number | null;
};

/** Uses stored snapshot when present; otherwise derives from carrier fee settings. */
export function getDispatcherCommissionCentsForLoad(
  load: LoadCommissionLike,
  carrier: CarrierFeeLike | undefined
): number {
  if (load.status !== "delivered" || !carrier) return 0;
  if (
    load.dispatcher_commission_cents != null &&
    !Number.isNaN(Number(load.dispatcher_commission_cents))
  ) {
    return Math.round(Number(load.dispatcher_commission_cents));
  }
  return computeDispatcherCommissionCents({
    serviceFeeType: carrier.service_fee_type ?? "percent",
    rateCents: load.rate_cents,
    feePercent: carrier.fee_percent,
    feeFlatCents: carrier.service_fee_flat_cents,
  });
}
