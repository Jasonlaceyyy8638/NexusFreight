export type HelpFaqItem = {
  id: string;
  title: string;
  body: string;
  /** Extra terms used only for search matching */
  keywords?: string[];
};

export const HELP_FAQ_ITEMS: HelpFaqItem[] = [
  {
    id: "add-carrier",
    title: "How to add a carrier",
    keywords: ["fmcsa", "mc", "dot", "vetting", "agency"],
    body: `From the dashboard, open **Carriers** in the sidebar. Use the FMCSA search to look up an MC or DOT number, verify authority and safety data, then save the carrier to your workspace. You can attach drivers and loads once the carrier is on your roster.`,
  },
  {
    id: "nexusfreight-shield",
    title: "Understanding the NexusFreight Shield",
    keywords: ["compliance", "fmcsa", "authority", "revoked", "nightly", "monitoring"],
    body: `The NexusFreight Shield connects to FMCSA data on a schedule. If a carrier’s operating authority changes or is revoked, your team is alerted and risky assignments can be blocked automatically—so you’re not dispatching on stale paperwork. Check **Compliance & Documents** (fleet) or carrier profiles for current status.`,
  },
  {
    id: "billing",
    title: "Updating my billing",
    keywords: ["stripe", "subscription", "payment", "card", "invoice", "plan"],
    body: `Billing and subscription management are handled through Stripe. Use **Settings** to start or manage checkout when your workspace is enabled for paid plans. For plan changes or invoices, contact support if you don’t see a self-serve option yet.`,
  },
  {
    id: "create-load",
    title: "Creating and dispatching a load",
    keywords: ["dispatch", "sms", "driver", "alert"],
    body: `Open **Loads**, create a load with origin, destination, rate, and assigned driver. When you dispatch, NexusFreight can send automated driver alerts (including SMS where configured) so drivers get load details without manual back-and-forth.`,
  },
  {
    id: "live-map",
    title: "Using the Live Map",
    keywords: ["gps", "eld", "telematics", "tracking"],
    body: `**Live Map** shows truck positions when ELD or telematics integrations are connected. Ensure your fleet has completed ELD setup under **Settings → Integrations** (or your org’s integrations page) so positions stay current.`,
  },
  {
    id: "team-invites",
    title: "Inviting team members",
    keywords: ["users", "permissions", "admin", "dispatcher"],
    body: `Admins can invite teammates from **Team management**. Set roles and permissions (dispatch, financials, fleet edits) so each person only sees what they need. Invited users complete signup with the email you send.`,
  },
  {
    id: "settlements",
    title: "Revenue, settlements, and payroll",
    keywords: ["commission", "pay", "driver pay", "reports"],
    body: `Use **Revenue & settlements** (or **Payroll & Reports** on fleet) to review loads, fees, and settlement workflows. Exact steps depend on your org type—carrier vs agency—and configured integrations.`,
  },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

const SUPPORT_RESOURCES_ACCORDION_IDS = [
  "nexusfreight-shield",
  "create-load",
  "add-carrier",
] as const;

/** Short accordion list for Support & Resources (Shield, load alerts, carriers). */
export function getSupportResourcesAccordionFaqs(): HelpFaqItem[] {
  return SUPPORT_RESOURCES_ACCORDION_IDS.map((id) => {
    const item = HELP_FAQ_ITEMS.find((f) => f.id === id);
    if (!item) throw new Error(`Missing FAQ: ${id}`);
    return item;
  });
}

export function filterFaqs(query: string, items: HelpFaqItem[]): HelpFaqItem[] {
  const q = normalize(query);
  if (!q) return items;

  return items.filter((item) => {
    const hay = normalize(
      [
        item.title,
        item.body,
        ...(item.keywords ?? []),
      ].join(" ")
    );
    return hay.includes(q);
  });
}
