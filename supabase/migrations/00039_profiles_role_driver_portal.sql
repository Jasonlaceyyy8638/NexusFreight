-- Driver portal uses profile role = 'Driver' (existing CHECK on profiles.role).
-- Admin / Dispatcher use the main /dashboard; Driver users are routed to /driver/* via proxy.

COMMENT ON COLUMN public.profiles.role IS
  'App role: Admin, Dispatcher, or Driver. Driver = mobile driver portal (/driver); others = dispatcher dashboard (/dashboard).';
