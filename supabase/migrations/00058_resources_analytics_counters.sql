-- Cumulative engagement for marketing resources (incremented from public track API).

alter table public.resources
  add column if not exists view_count integer not null default 0
    check (view_count >= 0),
  add column if not exists cta_click_count integer not null default 0
    check (cta_click_count >= 0);

comment on column public.resources.view_count is 'Approximate article page loads (public track endpoint).';
comment on column public.resources.cta_click_count is 'Beta CTA taps from article sidebar (public track endpoint).';

-- Daily signup buckets for admin dashboard (last 30 days); service_role only.
create or replace function public.admin_signups_daily_30d()
returns table(bucket date, n bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (timezone('utc', p.created_at))::date as bucket,
    count(*)::bigint as n
  from public.profiles p
  where p.created_at >= (timezone('utc', now()) - interval '30 days')
  group by 1
  order by 1;
$$;

revoke all on function public.admin_signups_daily_30d() from public;
grant execute on function public.admin_signups_daily_30d() to service_role;

-- Increment counters for published guides only (called from Next.js track API, service_role).
create or replace function public.increment_resource_metric(p_slug text, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(trim(p_kind)) = 'view' then
    update public.resources
    set view_count = view_count + 1
    where lower(trim(slug)) = lower(trim(p_slug))
      and published_at is not null
      and published_at <= timezone('utc', now());
  elsif lower(trim(p_kind)) = 'cta' then
    update public.resources
    set cta_click_count = cta_click_count + 1
    where lower(trim(slug)) = lower(trim(p_slug))
      and published_at is not null
      and published_at <= timezone('utc', now());
  end if;
end;
$$;

revoke all on function public.increment_resource_metric(text, text) from public;
grant execute on function public.increment_resource_metric(text, text) to service_role;

create or replace function public.admin_active_trials_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint
  from public.profiles p
  where p.trial_ends_at is not null
    and p.trial_ends_at > timezone('utc', now())
    and coalesce(p.stripe_subscription_status, '') not in ('active', 'trialing');
$$;

revoke all on function public.admin_active_trials_count() from public;
grant execute on function public.admin_active_trials_count() to service_role;
