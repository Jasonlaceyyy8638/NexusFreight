/** Server-only chrome: avoids client/SSR copy skew on the title during dev HMR. */
export function DashboardSettingsHeader() {
  return (
    <header>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Settings
      </p>
      <h1 className="text-xl font-semibold tracking-tight text-white">
        Profile &amp; connected services
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Your account and what&apos;s connected for this workspace.
      </p>
    </header>
  );
}
