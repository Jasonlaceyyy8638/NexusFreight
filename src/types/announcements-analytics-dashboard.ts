export type SignupDayPoint = { date: string; count: number };

export type EmailEngagementBar = {
  id: string;
  label: string;
  sent: number;
  opened: number;
  clicked: number;
};

export type InactiveRecipientRow = {
  profile_id: string;
  email: string;
  full_name: string | null;
  last_open_at: string | null;
};

export type AnnouncementsAnalyticsDashboardData = {
  signups_daily: SignupDayPoint[];
  email_engagement: EmailEngagementBar[];
  total_users: number;
  average_open_rate_pct: number;
  active_trials: number;
  inactive_users: InactiveRecipientRow[];
};
