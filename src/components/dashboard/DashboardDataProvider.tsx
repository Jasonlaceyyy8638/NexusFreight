"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { DemoGateModal } from "@/components/dashboard/DemoGateModal";
import { createClient } from "@/lib/supabase/client";
import {
  DEMO_ORG_ID,
  demoCarriers,
  demoDrivers,
  demoEld,
  demoLoads,
  demoTrucks,
  getInteractiveDemoBundle,
  type InteractiveDemoVariant,
} from "@/lib/demo_data";
import { money } from "@/lib/dashboard/format";
import { computeDispatcherCommissionCents } from "@/lib/calculations";
import {
  CARRIER_AUTHORITY_REVOKED_ASSIGNMENT_WARNING,
  carrierAuthorityAssignable,
} from "@/lib/carrier-authority";
import {
  effectiveOrgIdFromProfile,
  organizationNameFromProfile,
  orgTypeFromEmbed,
  profileHasWorkspaceLink,
} from "@/lib/dashboard/workspace-access";
import { normalizeDriverRosterStatus } from "@/lib/driver-roster-status";
import {
  mergePermissionRow,
  PERMISSIONS_FULL_ACCESS,
  type DashboardPermissionFlags,
} from "@/lib/permissions";
import type {
  Carrier,
  Driver,
  DriverRosterStatus,
  EldConnection,
  Load,
  LoadStatus,
  OrgType,
  ProfileRole,
  Truck,
  TrialType,
} from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

function applyBundle(
  setters: {
    setOrgId: (v: string | null) => void;
    setOrgType: (v: OrgType) => void;
    setCarriers: (v: Carrier[]) => void;
    setDrivers: (v: Driver[]) => void;
    setLoads: (v: Load[]) => void;
    setTrucks: (v: Truck[]) => void;
    setEldConnections: (v: EldConnection[]) => void;
    setSelectedCarrierId: Dispatch<SetStateAction<string | null>>;
  },
  b: ReturnType<typeof getInteractiveDemoBundle>
) {
  setters.setOrgId(b.orgId);
  setters.setOrgType(b.orgType);
  setters.setCarriers(b.carriers);
  setters.setDrivers(b.drivers);
  setters.setLoads(b.loads);
  setters.setTrucks(b.trucks);
  setters.setEldConnections(b.eldConnections);
  setters.setSelectedCarrierId((prev) =>
    prev && b.carriers.some((c) => c.id === prev)
      ? prev
      : b.defaultSelectedCarrierId
  );
}

export type DashboardUserRole = "carrier" | "dispatcher";

export type DashboardDataContextValue = {
  supabase: SupabaseClient | null;
  orgId: string | null;
  orgType: OrgType;
  /** Mirrors org type: carrier org vs dispatch agency. */
  userRole: DashboardUserRole;
  /** True when org is a fleet (single-tenant carrier workspace). */
  isCarrierOrg: boolean;
  usingDemo: boolean;
  /** Cookie-based hands-on sandbox (no login). */
  interactiveDemo: boolean;
  interactiveDemoVariant: InteractiveDemoVariant | null;
  /** Supabase session user id when signed in; used to hide demo chrome. */
  authSessionUserId: string | null;
  /** False until initial `getSession` completes (avoid demo banner flash). */
  authSessionResolved: boolean;
  /** Signed in but profile has no org — empty workspace, not seeded demo data. */
  onboardingRequired: boolean;
  /** Tenant display name when joined from `profiles.organizations`. */
  organizationName: string | null;
  carriers: Carrier[];
  drivers: Driver[];
  loads: Load[];
  trucks: Truck[];
  eldConnections: EldConnection[];
  selectedCarrierId: string | null;
  setSelectedCarrierId: (id: string | null) => void;
  refresh: () => Promise<void>;
  dispatchSms: (load: Load) => Promise<void>;
  money: typeof money;
  openDemoAccountGate: () => void;
  /** Effective flags for the signed-in user (demo = full access). */
  permissions: DashboardPermissionFlags;
  profileRole: ProfileRole | null;
  currentProfileId: string | null;
  trialType: TrialType | null;
  trialEndsAt: string | null;
  isBetaUser: boolean;
  hasStripeSubscription: boolean;
  /** Interactive carrier demo only: append a driver to local state. */
  addDemoDriver: (input: {
    full_name: string;
    phone: string;
    phone_carrier?: string | null;
    cdl_number: string;
    license_expiration: string | null;
    assigned_truck_id: string | null;
    status: DriverRosterStatus;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_relationship?: string | null;
    pay_structure?: Driver["pay_structure"];
    pay_percent_of_gross?: number | null;
    pay_cpm_cents?: number | null;
  }) => void;
  updateDriverRosterStatus: (
    driverId: string,
    status: DriverRosterStatus
  ) => Promise<void>;
  updateLoadStatus: (loadId: string, status: LoadStatus) => Promise<void>;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(
  null
);

export function DashboardDataProvider({
  children,
  demoSession,
  serverOnboardingRequired = false,
}: {
  children: ReactNode;
  demoSession?: InteractiveDemoVariant | null;
  /** Server read of profiles.org_id — avoids showing the empty-workspace banner on a laggy client fetch. */
  serverOnboardingRequired?: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const seedBundle =
    demoSession === "dispatcher" || demoSession === "carrier"
      ? getInteractiveDemoBundle(demoSession)
      : null;

  const [orgId, setOrgId] = useState<string | null>(
    () => seedBundle?.orgId ?? null
  );
  const [orgType, setOrgType] = useState<OrgType>(
    () => seedBundle?.orgType ?? "Agency"
  );
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [usingDemo, setUsingDemo] = useState(
    () => !supabase || Boolean(seedBundle)
  );
  const [interactiveDemo, setInteractiveDemo] = useState(false);
  const [authSessionUserId, setAuthSessionUserId] = useState<string | null>(
    null
  );
  const [authSessionResolved, setAuthSessionResolved] = useState(false);
  const [interactiveDemoVariant, setInteractiveDemoVariant] = useState<
    InteractiveDemoVariant | null
  >(demoSession ?? null);
  const [carriers, setCarriers] = useState<Carrier[]>(
    () => seedBundle?.carriers ?? (supabase ? [] : demoCarriers)
  );
  const [drivers, setDrivers] = useState<Driver[]>(
    () => seedBundle?.drivers ?? (supabase ? [] : demoDrivers)
  );
  const [loads, setLoads] = useState<Load[]>(
    () => seedBundle?.loads ?? (supabase ? [] : demoLoads)
  );
  const [trucks, setTrucks] = useState<Truck[]>(
    () => seedBundle?.trucks ?? (supabase ? [] : demoTrucks)
  );
  const [eldConnections, setEldConnections] = useState<EldConnection[]>(
    () => seedBundle?.eldConnections ?? (supabase ? [] : demoEld)
  );
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(
    () =>
      seedBundle?.defaultSelectedCarrierId ??
      (supabase ? null : demoCarriers[0]?.id ?? null)
  );
  const [permissions, setPermissions] = useState<DashboardPermissionFlags>(
    () => PERMISSIONS_FULL_ACCESS
  );
  const [profileRole, setProfileRole] = useState<ProfileRole | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [trialType, setTrialType] = useState<TrialType | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [isBetaUser, setIsBetaUser] = useState(false);
  const [hasStripeSubscription, setHasStripeSubscription] = useState(false);
  const [demoGateOpen, setDemoGateOpen] = useState(false);
  const [onboardingRequired, setOnboardingRequired] = useState(() => {
    if (demoSession === "dispatcher" || demoSession === "carrier") {
      return false;
    }
    return Boolean(serverOnboardingRequired);
  });

  const openDemoAccountGate = useCallback(() => setDemoGateOpen(true), []);

  /** One try: link `pending_signups` after email confirm or missed signup attach. */
  const pendingStripeRecoveryAttemptedRef = useRef(false);

  useEffect(() => {
    if (!supabase) {
      setAuthSessionResolved(true);
      return;
    }
    let cancelled = false;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      const uid = session?.user?.id ?? null;
      setAuthSessionUserId(uid);
      setAuthSessionResolved(true);
      if (uid && demoSession) {
        void fetch("/api/demo/clear-cookie", {
          method: "POST",
          credentials: "include",
        }).then(() => router.refresh());
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      setAuthSessionUserId(uid);
      if (event === "SIGNED_IN" && uid) {
        void fetch("/api/demo/clear-cookie", {
          method: "POST",
          credentials: "include",
        }).then(() => router.refresh());
      }
      if (event === "SIGNED_OUT") {
        setAuthSessionUserId(null);
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, router, demoSession]);

  const refresh = useCallback(async () => {
    const S = {
      setOrgId,
      setOrgType,
      setCarriers,
      setDrivers,
      setLoads,
      setTrucks,
      setEldConnections,
      setSelectedCarrierId,
    };

    if (!supabase) {
      setOnboardingRequired(false);
      setUsingDemo(true);
      setPermissions(PERMISSIONS_FULL_ACCESS);
      setProfileRole(null);
      setCurrentProfileId(null);
      setTrialType(null);
      setTrialEndsAt(null);
      setIsBetaUser(false);
      setHasStripeSubscription(false);
      if (demoSession === "dispatcher" || demoSession === "carrier") {
        const b = getInteractiveDemoBundle(demoSession);
        setInteractiveDemo(true);
        setInteractiveDemoVariant(demoSession);
        applyBundle(S, b);
      } else {
        setInteractiveDemo(false);
        setInteractiveDemoVariant(null);
        applyBundle(S, getInteractiveDemoBundle("dispatcher"));
      }
      return;
    }

    if (demoSession) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setOnboardingRequired(false);
        const b = getInteractiveDemoBundle(demoSession);
        setUsingDemo(true);
        setInteractiveDemo(true);
        setInteractiveDemoVariant(demoSession);
        setPermissions(PERMISSIONS_FULL_ACCESS);
        setProfileRole(null);
        setCurrentProfileId(null);
        setTrialType(null);
        setTrialEndsAt(null);
        setIsBetaUser(false);
        setHasStripeSubscription(false);
        applyBundle(S, b);
        return;
      }
      setInteractiveDemo(false);
      setInteractiveDemoVariant(null);
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const profileSelect =
      "org_id, role, id, trial_type, trial_ends_at, is_beta_user, stripe_subscription_id, organizations ( id, name, type )" as const;
    const { data: profileRow, error: profileError } = authUser?.id
      ? await supabase
          .from("profiles")
          .select(profileSelect)
          .eq("id", authUser.id)
          .maybeSingle()
      : await supabase.from("profiles").select(profileSelect).maybeSingle();

    if (profileError) {
      return;
    }

    let profile = profileRow;

    if (
      authUser?.id &&
      profile &&
      !profile.org_id?.trim() &&
      !pendingStripeRecoveryAttemptedRef.current
    ) {
      pendingStripeRecoveryAttemptedRef.current = true;
      const { data: sessWrap } = await supabase.auth.getSession();
      const token = sessWrap.session?.access_token;
      if (token) {
        const res = await fetch("/api/stripe/attach-pending-signup", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const j = (await res.json().catch(() => ({}))) as {
            recovered?: boolean;
          };
          if (j.recovered) {
            const { data: again } = await supabase
              .from("profiles")
              .select(profileSelect)
              .eq("id", authUser.id)
              .maybeSingle();
            if (again) profile = again;
          }
        }
      }
    }

    const resolvedOrgId = effectiveOrgIdFromProfile(profile);
    if (!profileHasWorkspaceLink(profile) || !resolvedOrgId) {
      if (authUser) {
        setOnboardingRequired(true);
        setUsingDemo(false);
        setInteractiveDemo(false);
        setInteractiveDemoVariant(null);
        setOrganizationName(null);
        setOrgId(null);
        setOrgType("Agency");
        setCarriers([]);
        setDrivers([]);
        setLoads([]);
        setTrucks([]);
        setEldConnections([]);
        setSelectedCarrierId(null);
        setCurrentProfileId(profile?.id ?? null);
        setProfileRole((profile?.role as ProfileRole) ?? null);
        setTrialType((profile?.trial_type as TrialType) ?? null);
        setTrialEndsAt(profile?.trial_ends_at ?? null);
        setIsBetaUser(Boolean(profile?.is_beta_user));
        setHasStripeSubscription(
          Boolean(profile?.stripe_subscription_id?.trim())
        );
        if (profile?.id) {
          const { data: permRow } = await supabase
            .from("user_permissions")
            .select("*")
            .eq("profile_id", profile.id)
            .maybeSingle();
          setPermissions(
            mergePermissionRow(
              profile.role as ProfileRole,
              permRow as Partial<DashboardPermissionFlags> | null
            )
          );
        } else {
          setPermissions(mergePermissionRow(null, null));
        }
        return;
      }

      setOnboardingRequired(false);
      setUsingDemo(true);
      setPermissions(PERMISSIONS_FULL_ACCESS);
      setProfileRole(null);
      setCurrentProfileId(null);
      setTrialType(null);
      setTrialEndsAt(null);
      setIsBetaUser(false);
      setHasStripeSubscription(false);
      applyBundle(S, getInteractiveDemoBundle("dispatcher"));
      setOrgId(DEMO_ORG_ID);
      return;
    }

    if (!profile) {
      return;
    }

    setOnboardingRequired(false);
    setUsingDemo(false);
    setOrgId(resolvedOrgId);
    setOrganizationName(organizationNameFromProfile(profile));
    setCurrentProfileId(profile.id);
    setProfileRole(profile.role as ProfileRole);
    setTrialType((profile.trial_type as TrialType) ?? null);
    setTrialEndsAt(profile.trial_ends_at ?? null);
    setIsBetaUser(Boolean(profile.is_beta_user));
    setHasStripeSubscription(
      Boolean(profile.stripe_subscription_id?.trim())
    );
    const { data: permRow } = await supabase
      .from("user_permissions")
      .select("*")
      .eq("profile_id", profile.id)
      .maybeSingle();
    setPermissions(
      mergePermissionRow(
        profile.role as ProfileRole,
        permRow as Partial<DashboardPermissionFlags> | null
      )
    );
    const embeddedType = orgTypeFromEmbed(profile.organizations);
    if (embeddedType) {
      setOrgType(embeddedType);
    } else {
      const { data: orgRow } = await supabase
        .from("organizations")
        .select("type")
        .eq("id", resolvedOrgId)
        .maybeSingle();
      const t =
        orgRow && (orgRow as { type?: string }).type === "Carrier"
          ? "Carrier"
          : "Agency";
      setOrgType(t);
    }

    const [cRes, dRes, lRes, tRes, eRes] = await Promise.all([
      supabase.from("carriers").select("*").eq("org_id", resolvedOrgId),
      supabase.from("drivers").select("*").eq("org_id", resolvedOrgId),
      supabase.from("loads").select("*").eq("org_id", resolvedOrgId),
      supabase.from("trucks").select("*").eq("org_id", resolvedOrgId),
      supabase.from("eld_connections").select("*").eq("org_id", resolvedOrgId),
    ]);
    const carrierList = (cRes.data as Carrier[]) ?? [];
    setCarriers(carrierList);
    setDrivers((dRes.data as Driver[]) ?? []);
    setLoads((lRes.data as Load[]) ?? []);
    setTrucks((tRes.data as Truck[]) ?? []);
    setEldConnections((eRes.data as EldConnection[]) ?? []);
    setSelectedCarrierId((prev) => {
      if (prev && carrierList.some((c) => c.id === prev)) return prev;
      return carrierList[0]?.id ?? null;
    });
  }, [supabase, demoSession]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void refresh();
    });
    return () => cancelAnimationFrame(id);
  }, [refresh]);

  useEffect(() => {
    if (orgType !== "Carrier" || carriers.length !== 1) return;
    setSelectedCarrierId((prev) =>
      prev === carriers[0].id ? prev : carriers[0].id
    );
  }, [orgType, carriers]);

  const addDemoDriver = useCallback(
    (input: {
      full_name: string;
      phone: string;
      phone_carrier?: string | null;
      cdl_number: string;
      license_expiration: string | null;
      assigned_truck_id: string | null;
      status: DriverRosterStatus;
      emergency_contact_name?: string | null;
      emergency_contact_phone?: string | null;
      emergency_contact_relationship?: string | null;
      pay_structure?: Driver["pay_structure"];
      pay_percent_of_gross?: number | null;
      pay_cpm_cents?: number | null;
    }) => {
      const carrierId = selectedCarrierId ?? carriers[0]?.id;
      const oid = orgId;
      if (!carrierId || !oid) return;
      const newDriver: Driver = {
        id: crypto.randomUUID(),
        org_id: oid,
        carrier_id: carrierId,
        full_name: input.full_name,
        phone: input.phone || null,
        phone_carrier: input.phone_carrier?.trim() || null,
        status: input.status,
        cdl_number: input.cdl_number || null,
        license_expiration: input.license_expiration,
        assigned_truck_id: input.assigned_truck_id,
        emergency_contact_name: input.emergency_contact_name ?? null,
        emergency_contact_phone: input.emergency_contact_phone ?? null,
        emergency_contact_relationship:
          input.emergency_contact_relationship ?? null,
        pay_structure: input.pay_structure ?? "percent_gross",
        pay_percent_of_gross: input.pay_percent_of_gross ?? 30,
        pay_cpm_cents: input.pay_cpm_cents ?? 70,
      };
      setDrivers((prev) => [...prev, newDriver]);
    },
    [carriers, orgId, selectedCarrierId]
  );

  const updateDriverRosterStatus = useCallback(
    async (driverId: string, status: DriverRosterStatus) => {
      if (interactiveDemo) {
        setDrivers((prev) =>
          prev.map((d) => (d.id === driverId ? { ...d, status } : d))
        );
        return;
      }
      if (!supabase) {
        alert("Connect Supabase to update driver status.");
        return;
      }
      const { error } = await supabase
        .from("drivers")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", driverId);
      if (error) {
        alert(error.message);
        return;
      }
      await refresh();
    },
    [supabase, refresh, interactiveDemo]
  );

  const dispatchSms = useCallback(
    async (load: Load) => {
      if (interactiveDemo) {
        openDemoAccountGate();
        return;
      }
      const carrierRow = carriers.find((c) => c.id === load.carrier_id);
      if (carrierRow && !carrierAuthorityAssignable(carrierRow)) {
        alert(CARRIER_AUTHORITY_REVOKED_ASSIGNMENT_WARNING);
        return;
      }
      const driver = load.driver_id
        ? drivers.find((d) => d.id === load.driver_id)
        : null;
      const phone = driver?.phone;
      if (!phone) {
        alert("Assign a driver with a phone number before dispatch.");
        return;
      }
      if (
        driver &&
        normalizeDriverRosterStatus(driver.status) !== "active"
      ) {
        alert("Driver must be Active on the roster to dispatch.");
        return;
      }

      const res = await fetch("/api/dispatch/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loadId: load.id,
          driverPhone: phone,
          origin: load.origin,
          destination: load.destination,
          rateCents: load.rate_cents,
          phoneCarrierDomain: driver.phone_carrier?.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(body.error ?? "Dispatch SMS failed");
        return;
      }
      const channel = (body as { channel?: string }).channel;
      if (supabase) {
        const truck =
          driver?.assigned_truck_id != null
            ? trucks.find((t) => t.id === driver.assigned_truck_id)
            : undefined;
        let deadheadMiles: number | undefined;
        if (
          truck?.last_lat != null &&
          truck?.last_lng != null
        ) {
          const dhRes = await fetch("/api/routing/deadhead-dispatch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromLat: truck.last_lat,
              fromLng: truck.last_lng,
              pickupAddress: load.origin,
            }),
          });
          const dhJson = await dhRes.json().catch(() => ({}));
          if (
            dhRes.ok &&
            typeof (dhJson as { deadheadMiles?: unknown }).deadheadMiles ===
              "number"
          ) {
            deadheadMiles = (dhJson as { deadheadMiles: number }).deadheadMiles;
          }
        }
        const nowIso = new Date().toISOString();
        const patch: Record<string, unknown> = {
          updated_at: nowIso,
          ...(deadheadMiles != null ? { deadhead_miles: deadheadMiles } : {}),
        };
        if (channel === "email_sms") {
          patch.status = "notification_sent";
          patch.driver_notified_at = nowIso;
        } else {
          patch.status = "dispatched";
          patch.dispatched_at = nowIso;
        }
        await supabase.from("loads").update(patch).eq("id", load.id);
      }
      await refresh();
    },
    [
      carriers,
      drivers,
      trucks,
      supabase,
      refresh,
      interactiveDemo,
      openDemoAccountGate,
    ]
  );

  const updateLoadStatus = useCallback(
    async (loadId: string, next: LoadStatus) => {
      const load = loads.find((l) => l.id === loadId);
      if (!load) return;
      const carrier = carriers.find((c) => c.id === load.carrier_id);
      if (interactiveDemo) {
        setLoads((prev) =>
          prev.map((l) => {
            if (l.id !== loadId) return l;
            let delivered_at = l.delivered_at;
            let dispatcher_commission_cents = l.dispatcher_commission_cents;
            if (next === "delivered") {
              delivered_at = new Date().toISOString();
              dispatcher_commission_cents =
                orgType === "Agency" && carrier
                  ? computeDispatcherCommissionCents({
                      serviceFeeType: carrier.service_fee_type ?? "percent",
                      rateCents: l.rate_cents,
                      feePercent: carrier.fee_percent,
                      feeFlatCents: carrier.service_fee_flat_cents,
                    })
                  : null;
            } else {
              delivered_at = null;
              dispatcher_commission_cents = null;
            }
            return {
              ...l,
              status: next,
              delivered_at,
              dispatcher_commission_cents,
            };
          })
        );
        return;
      }
      if (!supabase) {
        alert("Connect Supabase to update load status.");
        return;
      }
      const patch: Record<string, unknown> = {
        status: next,
        updated_at: new Date().toISOString(),
      };
      if (next === "delivered") {
        patch.delivered_at = new Date().toISOString();
        patch.dispatcher_commission_cents =
          orgType === "Agency" && carrier
            ? computeDispatcherCommissionCents({
                serviceFeeType: carrier.service_fee_type ?? "percent",
                rateCents: load.rate_cents,
                feePercent: carrier.fee_percent,
                feeFlatCents: carrier.service_fee_flat_cents,
              })
            : null;
      } else {
        patch.delivered_at = null;
        patch.dispatcher_commission_cents = null;
      }
      const { error } = await supabase
        .from("loads")
        .update(patch)
        .eq("id", loadId);
      if (error) {
        alert(error.message);
        return;
      }
      await refresh();
    },
    [loads, carriers, orgType, supabase, refresh, interactiveDemo]
  );

  /** Demo cookie `carrier` forces carrier UI immediately (orgType hydrates async from refresh). */
  const isCarrierOrg =
    orgType === "Carrier" ||
    (Boolean(interactiveDemo) && interactiveDemoVariant === "carrier");
  const userRole: DashboardUserRole = isCarrierOrg ? "carrier" : "dispatcher";

  const value = useMemo(
    () => ({
      supabase,
      orgId,
      orgType,
      userRole,
      isCarrierOrg,
      usingDemo,
      interactiveDemo,
      interactiveDemoVariant,
      authSessionUserId,
      authSessionResolved,
      onboardingRequired,
      organizationName,
      carriers,
      drivers,
      loads,
      trucks,
      eldConnections,
      selectedCarrierId,
      setSelectedCarrierId,
      refresh,
      dispatchSms,
      money,
      openDemoAccountGate,
      permissions,
      profileRole,
      currentProfileId,
      trialType,
      trialEndsAt,
      isBetaUser,
      hasStripeSubscription,
      addDemoDriver,
      updateDriverRosterStatus,
      updateLoadStatus,
    }),
    [
      supabase,
      orgId,
      orgType,
      userRole,
      isCarrierOrg,
      usingDemo,
      interactiveDemo,
      interactiveDemoVariant,
      authSessionUserId,
      authSessionResolved,
      onboardingRequired,
      organizationName,
      carriers,
      drivers,
      loads,
      trucks,
      eldConnections,
      selectedCarrierId,
      refresh,
      dispatchSms,
      openDemoAccountGate,
      permissions,
      profileRole,
      currentProfileId,
      trialType,
      trialEndsAt,
      isBetaUser,
      hasStripeSubscription,
      addDemoDriver,
      updateDriverRosterStatus,
      updateLoadStatus,
    ]
  );

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
      <DemoGateModal
        open={demoGateOpen}
        onClose={() => setDemoGateOpen(false)}
      />
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error("useDashboardData must be used within DashboardDataProvider");
  }
  return ctx;
}
