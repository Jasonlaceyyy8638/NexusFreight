"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboardData } from "@/components/dashboard/DashboardDataProvider";
import { PermissionToggle } from "@/components/dashboard/PermissionToggle";
import type { DashboardPermissionFlags } from "@/lib/permissions";
import {
  isTeamAdmin,
  mergePermissionRow,
  PERMISSIONS_FULL_ACCESS,
} from "@/lib/permissions";
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
};

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
  const [inviteFlags, setInviteFlags] = useState(emptyInviteFlags);
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
        .select("id, full_name, role, phone")
        .eq("org_id", orgId)
        .order("full_name"),
      supabase.from("user_permissions").select("*").eq("org_id", orgId),
      supabase
        .from("pending_team_invites")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false }),
    ]);
    setProfiles((pRes.data as ProfileRow[]) ?? []);
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
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.from("pending_team_invites").insert({
        org_id: orgId,
        email,
        full_name: inviteName.trim() || null,
        can_view_financials: inviteFlags.can_view_financials,
        can_dispatch_loads: inviteFlags.can_dispatch_loads,
        can_edit_fleet: inviteFlags.can_edit_fleet,
        admin_access: inviteFlags.admin_access,
      });
      if (error) throw error;
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteFlags(emptyInviteFlags);
      await load();
      setMsg("Invite saved. When they join your org, apply these flags in Supabase or re-open this page after signup hooks run.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save invite");
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
            In the live app, toggles are stored in{" "}
            <code className="rounded border border-white/10 px-1 text-xs text-slate-400">
              user_permissions
            </code>{" "}
            and enforced in the UI. Demo mode runs with full access.
          </p>
        </header>
        <div className="rounded-xl border border-amber-500/25 bg-amber-950/15 p-5 text-sm text-amber-100/90">
          <p className="font-medium text-amber-50">Preview only</p>
          <p className="mt-2 text-amber-100/80">
            Sign up and connect Supabase to invite teammates and edit permission
            switches. Sample toggles below match the production form.
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

  if (!supabase || !orgId) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-slate-500">
        Connect Supabase and sign in to manage team permissions.
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
            Add team member
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
                        {p.phone ? ` · ${p.phone}` : ""}
                      </p>
                    </div>
                  </div>
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
            <h3 className="text-lg font-semibold text-white">
              Add team member
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Stores permission defaults in{" "}
              <code className="text-slate-500">pending_team_invites</code> until
              they accept an invite and receive a profile.
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
                  onClick={() => setInviteOpen(false)}
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
