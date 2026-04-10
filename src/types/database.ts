export type OrgType = "Agency" | "Carrier";
export type ProfileRole = "Admin" | "Dispatcher" | "Driver";
export type LoadStatus =
  | "draft"
  | "dispatched"
  | "notification_sent"
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

export type TrialType = "BETA" | "TRIAL";

export type Profile = {
  id: string;
  org_id: string;
  role: ProfileRole;
  full_name: string | null;
  phone: string | null;
  /** Dispatcher mobile for SMS templates (`{{dispatcher_phone}}`); preferred when set. */
  phone_number?: string | null;
  /** Wireless SMS gateway host (e.g. vtext.com) for email-to-SMS. */
  phone_carrier?: string | null;
  trial_type?: TrialType | null;
  trial_ends_at?: string | null;
  is_beta_user?: boolean | null;
  stripe_subscription_id?: string | null;
  /** Synced from Stripe webhooks (`subscription.status`). */
  stripe_subscription_status?: string | null;
  stripe_customer_id?: string | null;
  /** Copied from auth for ops / announcements; may be null. */
  auth_email?: string | null;
  /** When true, excluded from bulk product announcement emails. */
  announcement_emails_opt_out?: boolean | null;
};

export type ServiceFeeType = "percent" | "flat";

export type CarrierComplianceStatus = "active" | "inactive";

export type Carrier = {
  id: string;
  org_id: string;
  name: string;
  mc_number: string | null;
  dot_number?: string | null;
  is_active_authority?: boolean | null;
  compliance_status?: CarrierComplianceStatus | null;
  compliance_alert?: string | null;
  /** Nightly FMCSA job and other automated compliance notes. */
  compliance_log?: string | null;
  /** FMCSA common authority status date (YYYY-MM-DD). */
  authority_date?: string | null;
  /** Denormalized; UI prefers recalculating from authority_date when set. */
  is_new_authority?: boolean | null;
  fee_percent: number;
  /** When `flat`, commission per delivered load is `service_fee_flat_cents`. */
  service_fee_type?: ServiceFeeType | null;
  service_fee_flat_cents?: number | null;
  contact_email: string | null;
  /** Wireless SMS gateway host for optional carrier mobile alerts. */
  phone_carrier?: string | null;
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
  /** Wireless SMS gateway host (e.g. vtext.com) for dispatch via email-to-SMS. */
  phone_carrier?: string | null;
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
  /** Set when this roster row is linked to a login for /driver. */
  auth_user_id?: string | null;
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
  /** Set when inviting a dispatch-capable user; copied to profile when they join. */
  phone_number?: string | null;
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

export type LoadActivityLogEntry = {
  at: string;
  message: string;
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
  /** Set when email-to-SMS (or future channels) successfully notifies the driver. */
  driver_notified_at?: string | null;
  delivered_at: string | null;
  /** SMS / quick-fire audit trail (newest entries appended). */
  activity_log?: LoadActivityLogEntry[] | null;
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

/** Landing page waitlist (`public.leads`). */
export type LeadRole = "Dispatcher" | "Fleet Owner" | "Owner-Operator";

export type Lead = {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  role: LeadRole;
  source: string;
  created_at: string;
};

export type SupportTicketStatus = "Open" | "In Progress" | "Resolved";
export type SupportTicketPriority = "Low" | "Medium" | "High";

export type SupportTicket = {
  id: string;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  screenshot_url: string | null;
  created_at: string;
};

/** Bulk product announcement send audit row. */
export type ProductUpdateSendLog = {
  id: string;
  payload_hash: string;
  title: string;
  body_excerpt: string;
  /** Full body from composer; used for reminder summaries. */
  body_text?: string | null;
  recipient_count: number;
  sent_at: string;
};

/** Open / click timestamps for one profile and one send. */
export type AnnouncementStat = {
  id: string;
  announcement_id: string;
  user_id: string;
  opened_at: string | null;
  clicked_at: string | null;
};

/** Successful delivery row for a bulk announcement (reminder targeting). */
export type AnnouncementSendRecipient = {
  id: string;
  announcement_id: string;
  user_id: string;
  email: string;
  sent_at: string;
};

/** Automated unread reminder (unique per announcement + profile). */
export type AnnouncementReminderLog = {
  id: string;
  announcement_id: string;
  user_id: string;
  sent_at: string;
};

/** Public marketing guide for /resources (Markdown body; drafts omit published_at). */
export type Resource = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  published_at: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};
