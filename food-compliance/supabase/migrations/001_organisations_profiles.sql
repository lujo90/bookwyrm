-- ─── 001: Organisations & Profiles ──────────────────────────────────────────
-- Foundation tables. Every other table references organisations via FK.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── organisations ────────────────────────────────────────────────────────────

create table organisations (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  slug               text not null unique,
  country_code       text not null,          -- ISO 3166-1 alpha-2, e.g. "DE"
  subscription_tier  text not null default 'free'
                       check (subscription_tier in ('free','starter','pro','enterprise')),
  stripe_customer_id text null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table organisations enable row level security;

-- Users can only see / edit their own organisation
create policy "org_select" on organisations
  for select using (
    id = (select organisation_id from profiles where id = auth.uid())
  );

create policy "org_update" on organisations
  for update using (
    id = (select organisation_id from profiles where id = auth.uid())
  );

-- ─── profiles ─────────────────────────────────────────────────────────────────
-- One row per Supabase auth user.

create table profiles (
  id                  uuid primary key references auth.users on delete cascade,
  organisation_id     uuid not null references organisations on delete cascade,
  full_name           text not null default '',
  email               text not null,
  role                text not null default 'member'
                        check (role in ('owner','admin','member','viewer')),
  avatar_url          text null,
  onboarding_complete boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profile_select_own" on profiles
  for select using (id = auth.uid());

create policy "profile_update_own" on profiles
  for update using (id = auth.uid());

-- Allow users to insert their own profile (called from auth callback)
create policy "profile_insert_own" on profiles
  for insert with check (id = auth.uid());

-- ─── updated_at triggers ──────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organisations_updated_at
  before update on organisations
  for each row execute function set_updated_at();

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();
