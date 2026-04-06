export type OrgType = "Agency" | "Carrier";
export type ProfileRole = "Admin" | "Dispatcher" | "Driver";
export type LoadStatus =
  | "draft"
  | "dispatched"
  | "in_transit"
  | "delivered"
  | "cancelled";
export type EldProvider = "samsara" | "motive" | "geotab";

/** Driver roster / HR status (not load assignment). */
export type DriverRosterStatus = "active" | "on_vacation" | "terminated";

export type Organization = {
  id: string;
  name: string;
  type: OrgType;
  settings: Record<string, unknown>;
  dot_number?: string | null;
  mc_number?: string | null;
  is_active_authority?: boolean | null;
};

export type Profile = {
  id: string;
  org_id: string;
  role: ProfileRole;
  full_name: string | null;
  phone: string | null;
};

export type ServiceFeeType = "percent" | "flat";

export type Carrier = {
  id: string;
  org_id: string;
  name: string;
  mc_number: string | null;
  dot_number?: string | null;
  is_active_authority?: boolean | null;
  fee_percent: number;
  /** When `flat`, commission per delivered load is `service_fee_flat_cents`. */
  service_fee_type?: ServiceFeeType | null;
  service_fee_flat_cents?: number | null;
  contact_email: string | null;
  /** Magic-link ELD connect completed; dispatcher live map requires this. */
  eld_handshake_completed_at?: string | null;
};

export type DriverPayStructure = "percent_gross" | "cpm";

export type Driver = {
  id: string;
  org_id: string;
  carrier_id: string;
  full_name: string;
  phone: string | null;
  contact_email?: string | null;
  status: DriverRosterStatus | string;
  /** Preferred CDL identifier (migration adds column; legacy may use license_number). */
  cdl_number?: string | null;
  license_number?: string | null;
  license_expiration?: string | null;
  assigned_truck_id?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  pay_structure?: DriverPayStructure | null;
  pay_percent_of_gross?: number | null;
  /** Cents per loaded mile (e.g. 70 = $0.70/mi). */
  pay_cpm_cents?: number | null;
};

export type UserPermissionsRow = {
  profile_id: string;
  org_id: string;
  can_view_financials: boolean;
  can_dispatch_loads: boolean;
  can_edit_fleet: boolean;
  admin_access: boolean;
};

export type PendingTeamInvite = {
  id: string;
  org_id: string;
  email: string;
  full_name: string | null;
  can_view_financials: boolean;
  can_dispatch_loads: boolean;
  can_edit_fleet: boolean;
  admin_access: boolean;
  created_at: string;
};

export type TruckFleetStatus = "active" | "maintenance";

export type Truck = {
  id: string;
  org_id: string;
  carrier_id: string;
  unit_number: string;
  last_lat: number | null;
  last_lng: number | null;
  /** Mirrored from telematics sync (preferred by Live Map when set). */
  current_latitude?: number | null;
  current_longitude?: number | null;
  last_ping_at: string | null;
  eld_external_id?: string | null;
  /** Road-ready vs shop — optional until stored in DB */
  fleet_status?: TruckFleetStatus | null;
};

export type Load = {
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
  pay_deadhead?: boolean | null;
  deadhead_rate_cpm_cents?: number | null;
  deadhead_miles?: number | null;
  loaded_miles?: number | null;
  deadhead_pay_cents?: number | null;
  loaded_driver_pay_cents?: number | null;
  driver_total_pay_cents?: number | null;
  dispatcher_commission_cents?: number | null;
};

export type EldConnection = {
  id: string;
  org_id: string;
  carrier_id: string;
  provider: EldProvider;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
};
