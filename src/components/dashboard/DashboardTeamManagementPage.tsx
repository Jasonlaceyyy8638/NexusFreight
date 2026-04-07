"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { PermissionToggle } from "@/components/dashboard/PermissionToggle";
import type { DashboardPermissionFlags } from "@/lib/permissions";
import {
  isTeamAdmin,
  mergePermissionRow,
  PERMISSIONS_FULL_ACCESS,
} from "@/lib/permissions";
import { isDispatcherPhoneProvided } from "@/lib/phone/dispatcher-phone";
import type {
  PendingTeamInvite,
  ProfileRole,
  UserPermissionsRow,
} from "@/types/database";

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string;
  phone: string | null;
  phone_number: string | null;
};

function memberNeedsDispatcherPhone(
  role: string,
  eff: DashboardPermissionFlags
): boolean {
  return role === "Dispatcher" || eff.can_dispatch_loads;
}

const emptyInviteFlags: DashboardPermissionFlags = {
  can_view_financials: false,
  can_dispatch_loads: true,
  can_edit_fleet: false,
  admin_access: false,
};

export function DashboardTeamManagementPage() {
  const {
    supabase,
    orgId,
    interactiveDemo,
    openDemoAccountGate,
    profileRole,
    permissions,
    refresh,
  } = useDashboardData();

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [permMap, setPermMap] = useState<
    Record<string, DashboardPermissionFlags>
  >({});
  const [pending, setPending] = useState<PendingTeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteFlags, setInviteFlags] = useState(emptyInviteFlags);
  const [memberPhones, setMemberPhones] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canAdmin =
    interactiveDemo || isTeamAdmin(profileRole, permissions);

  const load = useCallback(async () => {
    if (!supabase || !orgId || interactiveDemo) {
      setLoading(false);
      setProfiles([]);
      setPending([]);
      return;
    }
    setLoading(true);
    const [pRes, upRes, invRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, role, phone, phone_number")
        .eq("org_id", orgId)
        .order("full_name"),
      supabase.from("user_permissions").select("*").eq("org_id", orgId),
      supabase
        .from("pending_team_invites")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false }),
    ]);
    const list = (pRes.data as ProfileRow[]) ?? [];
    setProfiles(list);
    setMemberPhones(
      Object.fromEntries(
        list.map((row) => [
          row.id,
          row.phone_number?.trim() || row.phone?.trim() || "",
        ])
      )
    );
    const map: Record<string, DashboardPermissionFlags> = {};
    for (const row of (upRes.data as UserPermissionsRow[]) ?? []) {
      map[row.profile_id] = {
        can_view_financials: row.can_view_financials,
        can_dispatch_loads: row.can_dispatch_loads,
        can_edit_fleet: row.can_edit_fleet,
        admin_access: row.admin_access,
      };
    }
    setPermMap(map);
    setPending((invRes.data as PendingTeamInvite[]) ?? []);
    setLoading(false);
  }, [supabase, orgId, interactiveDemo]);

  useEffect(() => {
    void load();
  }, [load]);

  const effectiveFor = useCallback(
    (p: ProfileRow): DashboardPermissionFlags => {
      if (interactiveDemo) return PERMISSIONS_FULL_ACCESS;
      const row = permMap[p.id];
      return mergePermissionRow(p.role as ProfileRole, row ?? null);
    },
    [interactiveDemo, permMap]
  );

  const savePermissions = async (
    profileId: string,
    next: DashboardPermissionFlags
  ) => {
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    if (!supabase || !orgId || !canAdmin) return;
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.from("user_permissions").upsert(
        {
          profile_id: profileId,
          org_id: orgId,
          can_view_financials: next.can_view_financials,
          can_dispatch_loads: next.can_dispatch_loads,
          can_edit_fleet: next.can_edit_fleet,
          admin_access: next.admin_access,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" }
      );
      if (error) throw error;
      setPermMap((m) => ({ ...m, [profileId]: next }));
      await refresh();
      setMsg("Permissions saved.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save permissions");
    } finally {
      setBusy(false);
    }
  };

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    if (!supabase || !orgId || !canAdmin) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setMsg("Email is required.");
      return;
    }
    if (
      inviteFlags.can_dispatch_loads &&
      !isDispatcherPhoneProvided(invitePhone)
    ) {
      setMsg(
        "Phone number is required for dispatchers (used as {{dispatcher_phone}} in load SMS)."
      );
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.from("pending_team_invites").insert({
        org_id: orgId,
        email,
        full_name: inviteName.trim() || null,
        phone_number: inviteFlags.can_dispatch_loads
          ? invitePhone.trim()
          : null,
        can_view_financials: inviteFlags.can_view_financials,
        can_dispatch_loads: inviteFlags.can_dispatch_loads,
        can_edit_fleet: inviteFlags.can_edit_fleet,
        admin_access: inviteFlags.admin_access,
      });
      if (error) throw error;
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInvitePhone("");
      setInviteFlags(emptyInviteFlags);
      await load();
      setMsg("Invite saved. When they join your org, apply these flags in Supabase or re-open this page after signup hooks run.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save invite");
    } finally {
      setBusy(false);
    }
  };

  const saveMemberDispatcherPhone = async (p: ProfileRow) => {
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    if (!supabase || !canAdmin) return;
    const eff = effectiveFor(p);
    if (!memberNeedsDispatcherPhone(p.role, eff)) return;
    const raw = memberPhones[p.id]?.trim() ?? "";
    if (!isDispatcherPhoneProvided(raw)) {
      setMsg(
        "Enter a valid phone number (at least 10 digits) for this dispatcher."
      );
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          phone_number: raw,
          phone: raw,
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.id);
      if (error) throw error;
      await load();
      await refresh();
      setMsg("Dispatcher phone saved.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not save phone");
    } finally {
      setBusy(false);
    }
  };

  const deleteInvite = async (id: string) => {
    if (interactiveDemo) {
      openDemoAccountGate();
      return;
    }
    if (!supabase || !canAdmin) return;
    await supabase.from("pending_team_invites").delete().eq("id", id);
    await load();
  };

  if (interactiveDemo) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Team management
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Roles &amp; permissions
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            This is the same roles &amp; permissions experience your team gets in
            production. The sample toggles below illustrate how access is
            granted for financials, dispatch, fleet, and admin actions.
          </p>
        </header>
        <div className="rounded-xl border border-[#007bff]/25 bg-[#0a1628]/60 p-5 text-sm text-slate-200">
          <p className="font-medium text-[#7eb8ff]">Interactive demo</p>
          <p className="mt-2 text-slate-400">
            Explore the full UI with full access. When you create an account,
            your organization&apos;s real permissions and invites are stored
            securely—nothing here is saved to a database in preview mode.
          </p>
        </div>
        <div className="space-y-3 rounded-xl border border-white/10 bg-[#16181A]/90 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            New member defaults (example)
          </p>
          <PermissionToggle
            id="demo-fin"
            label="Can view financials"
            description="Gross, commissions, settlements, payroll views"
            checked
            onChange={() => openDemoAccountGate()}
          />
          <PermissionToggle
            id="demo-disp"
            label="Can dispatch loads"
            description="Load entry modal and dispatch actions"
            checked
            onChange={() => openDemoAccountGate()}
          />
          <PermissionToggle
            id="demo-fleet"
            label="Can edit fleet"
            description="Add/remove trucks and drivers"
            checked={false}
            onChange={() => openDemoAccountGate()}
          />
          <PermissionToggle
            id="demo-admin"
            label="Admin access"
            description="Add/remove team members and edit their permissions"
            checked={false}
            onChange={() => openDemoAccountGate()}
          />
        </div>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-slate-500">
        Sign in to manage team permissions for your organization.
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-16 text-center text-sm text-slate-400">
        <p>
          No organization workspace is linked to this account yet. Team invites
          and permissions are available after your company workspace is created.
        </p>
        <p>
          <Link
            href="/auth/signup"
            className="font-semibold text-[#3395ff] hover:underline"
          >
            Continue signup
          </Link>
          {" · "}
          <a
            href="mailto:info@nexusfreight.tech"
            className="font-semibold text-[#3395ff] hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Team management
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-white">
            Roles &amp; permissions
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Changes save to{" "}
            <code className="rounded border border-white/10 px-1 text-xs text-slate-500">
              user_permissions
            </code>
            . Only organization admins can edit others.
          </p>
        </div>
        {canAdmin ? (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="rounded-md bg-[#007bff] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(0,123,255,0.25)] hover:opacity-90"
          >
            Add dispatcher
          </button>
        ) : null}
      </header>

      {msg ? (
        <p className="text-sm text-slate-400" role="status">
          {msg}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading team…</p>
      ) : (
        <section className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Members
          </h2>
          <ul className="space-y-4">
            {profiles.map((p) => {
              const eff = effectiveFor(p);
              const editable = canAdmin;
              const needsPhone = memberNeedsDispatcherPhone(p.role, eff);
              const displayPhone =
                p.phone_number?.trim() || p.phone?.trim() || "";
              return (
                <li
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-[#121416] p-5"
                >
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">
                        {p.full_name?.trim() || "Unnamed user"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Role: {p.role}
                        {displayPhone ? ` · ${displayPhone}` : ""}
                      </p>
                    </div>
                  </div>
                  {needsPhone ? (
                    <div className="mb-4 rounded-lg border border-white/[0.08] bg-[#16181A]/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Dispatcher phone
                        <span className="ml-1 text-amber-200/90">*</span>
                      </p>
                      <p className="mt-1 text-[11px] text-slate-600">
                        Used as{" "}
                        <code className="rounded border border-white/10 px-1">
                          {"{{dispatcher_phone}}"}
                        </code>{" "}
                        when this user sends load SMS.
                      </p>
                      <input
                        type="tel"
                        className="mt-2 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-white"
                        value={memberPhones[p.id] ?? ""}
                        onChange={(e) =>
                          setMemberPhones((m) => ({
                            ...m,
                            [p.id]: e.target.value,
                          }))
                        }
                        placeholder="+1 (555) 123-4567"
                        disabled={!editable || busy}
                        autoComplete="tel"
                      />
                      {editable ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void saveMemberDispatcherPhone(p)}
                          className="mt-2 rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/15 disabled:opacity-50"
                        >
                          Save phone
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <PermEditor
                      profileId={p.id}
                      field="financials"
                      label="Can view financials"
                      checked={eff.can_view_financials}
                      disabled={!editable || busy}
                      onCommit={(v) =>
                        void savePermissions(p.id, {
                          ...eff,
                          can_view_financials: v,
                        })
                      }
                    />
                    <PermEditor
                      profileId={p.id}
                      field="dispatch"
                      label="Can dispatch loads"
                      checked={eff.can_dispatch_loads}
                      disabled={!editable || busy}
                      onCommit={(v) =>
                        void savePermissions(p.id, {
                          ...eff,
                          can_dispatch_loads: v,
                        })
                      }
                    />
                    <PermEditor
                      profileId={p.id}
                      field="fleet"
                      label="Can edit fleet"
                      checked={eff.can_edit_fleet}
                      disabled={!editable || busy}
                      onCommit={(v) =>
                        void savePermissions(p.id, { ...eff, can_edit_fleet: v })
                      }
                    />
                    <PermEditor
                      profileId={p.id}
                      field="admin"
                      label="Admin access"
                      checked={eff.admin_access}
                      disabled={!editable || busy}
                      onCommit={(v) =>
                        void savePermissions(p.id, { ...eff, admin_access: v })
                      }
                    />
                  </div>
                  {!editable ? (
                    <p className="mt-3 text-[11px] text-slate-600">
                      Only admins can change permission switches.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {pending.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Pending invites
          </h2>
          <ul className="space-y-2">
            {pending.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#16181A]/80 px-4 py-3 text-sm"
              >
                <span className="text-slate-300">
                  {inv.email}
                  {inv.full_name ? ` · ${inv.full_name}` : ""}
                </span>
                {canAdmin ? (
                  <button
                    type="button"
                    onClick={() => void deleteInvite(inv.id)}
                    className="text-xs font-semibold text-red-400/90 hover:text-red-300"
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {inviteOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#16181A] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white">Add dispatcher</h3>
            <p className="mt-1 text-xs text-slate-500">
              Stores permission defaults in{" "}
              <code className="text-slate-500">pending_team_invites</code> until
              they join. If{" "}
              <span className="text-slate-400">Can dispatch loads</span> is on, a
              phone number is required (
              <code className="text-slate-500">{"{{dispatcher_phone}}"}</code> in
              load SMS).
            </p>
            <form
              onSubmit={(e) => void submitInvite(e)}
              className="mt-4 space-y-4"
            >
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Email
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Full name
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                Phone number
                {inviteFlags.can_dispatch_loads ? (
                  <span className="ml-1 text-amber-200/90">*</span>
                ) : null}
                <input
                  type="tel"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  required={inviteFlags.can_dispatch_loads}
                  className="mt-1 w-full rounded-md border border-white/10 bg-[#121416] px-3 py-2 text-sm text-white"
                  placeholder={
                    inviteFlags.can_dispatch_loads
                      ? "Required for dispatch SMS"
                      : "Optional unless dispatch is enabled"
                  }
                  autoComplete="tel"
                />
              </label>
              <div className="space-y-2">
                <PermissionToggle
                  id="inv-fin"
                  label="Can view financials"
                  checked={inviteFlags.can_view_financials}
                  onChange={(v) =>
                    setInviteFlags((f) => ({ ...f, can_view_financials: v }))
                  }
                />
                <PermissionToggle
                  id="inv-disp"
                  label="Can dispatch loads"
                  checked={inviteFlags.can_dispatch_loads}
                  onChange={(v) =>
                    setInviteFlags((f) => ({ ...f, can_dispatch_loads: v }))
                  }
                />
                <PermissionToggle
                  id="inv-fleet"
                  label="Can edit fleet"
                  checked={inviteFlags.can_edit_fleet}
                  onChange={(v) =>
                    setInviteFlags((f) => ({ ...f, can_edit_fleet: v }))
                  }
                />
                <PermissionToggle
                  id="inv-admin"
                  label="Admin access"
                  checked={inviteFlags.admin_access}
                  onChange={(v) =>
                    setInviteFlags((f) => ({ ...f, admin_access: v }))
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setInviteOpen(false);
                    setInvitePhone("");
                  }}
                  className="rounded-md border border-white/15 px-3 py-2 text-sm text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-md bg-[#007bff] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save invite
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PermEditor(props: {
  profileId: string;
  field: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCommit: (v: boolean) => void;
}) {
  const id = `perm-${props.profileId}-${props.field}`;
  return (
    <PermissionToggle
      id={id}
      label={props.label}
      checked={props.checked}
      disabled={props.disabled}
      onChange={(v) => props.onCommit(v)}
    />
  );
}
