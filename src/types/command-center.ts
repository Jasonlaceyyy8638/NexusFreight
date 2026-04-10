export type CommandCenterHeader = {
  totalUsers: number;
  signupsLast7: number;
  signupsPrev7: number;
  activeTrials: number;
  resourceViews: number;
  resourceCta: number;
  resourceEngagement: number;
};

export type CommandCenterSignupPoint = {
  date: string;
  signups: number;
};

export type CommandCenterEmailFunnelRow = {
  id: string;
  title: string;
  sent_at: string;
  sent: number;
  opened: number;
  clicked: number;
};

export type CommandCenterPayload = {
  header: CommandCenterHeader;
  signupSeries: CommandCenterSignupPoint[];
  emailFunnel: CommandCenterEmailFunnelRow[];
};
