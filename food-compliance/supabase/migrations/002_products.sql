-- ─── 002: Products ───────────────────────────────────────────────────────────
-- One row per finished food/beverage product. Tracks readiness score.

create type product_status as enum ('draft','in_review','approved','archived');

create table products (
  id                   uuid primary key default gen_random_uuid(),
  organisation_id      uuid not null references organisations on delete cascade,
  name                 text not null,
  sku                  text null,
  category             text null,            -- e.g. "dairy", "bakery", "beverage"
  status               product_status not null default 'draft',
  readiness_score      integer not null default 0
                         check (readiness_score >= 0 and readiness_score <= 100),
  readiness_breakdown  jsonb null,           -- ScoreBreakdown JSON
  target_markets       text[] not null default '{}',  -- ISO country codes
  created_by           uuid not null references profiles on delete restrict,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table products enable row level security;

create policy "products_select" on products
  for select using (
    organisation_id = (select organisation_id from profiles where id = auth.uid())
  );

create policy "products_insert" on products
  for insert with check (
    organisation_id = (select organisation_id from profiles where id = auth.uid())
  );

create policy "products_update" on products
  for update using (
    organisation_id = (select organisation_id from profiles where id = auth.uid())
  );

create policy "products_delete" on products
  for delete using (
    organisation_id = (select organisation_id from profiles where id = auth.uid())
  );

create trigger products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- Index for the common query: all products for an org
create index products_organisation_id_idx on products (organisation_id);
