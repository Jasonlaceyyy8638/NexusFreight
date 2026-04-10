-- Public marketing resources (guides) for /resources SEO hub.

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  excerpt text not null default '',
  content text not null default '',
  category text not null default 'General',
  published_at timestamptz,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_slug_len check (char_length(slug) >= 1 and char_length(slug) <= 200)
);

create unique index if not exists resources_slug_key on public.resources (lower(slug));

create index if not exists resources_published_at_idx
  on public.resources (published_at desc nulls last);

alter table public.resources enable row level security;

-- Anonymous and logged-in site visitors: only rows that are published and not scheduled for the future.
create policy "resources_select_published"
  on public.resources
  for select
  to anon, authenticated
  using (
    published_at is not null
    and published_at <= now()
  );

create or replace function public.set_resources_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists resources_set_updated_at on public.resources;
create trigger resources_set_updated_at
  before update on public.resources
  for each row
  execute function public.set_resources_updated_at();

comment on table public.resources is 'Public SEO guides; drafts omit published_at. Writes via service role / admin API only.';
