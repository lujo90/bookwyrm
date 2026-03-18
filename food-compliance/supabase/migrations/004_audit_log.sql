-- ─── 004: Audit Log ──────────────────────────────────────────────────────────
-- Immutable record of every significant action. No UPDATE or DELETE allowed.

create table audit_log (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references organisations on delete cascade,
  product_id       uuid null references products on delete set null,
  actor_id         uuid null references profiles on delete set null,
  actor_email      text not null,        -- kept even if profile is deleted
  action_type      text not null,        -- e.g. 'checklist_item_completed'
  description      text not null,        -- human-readable sentence
  resource_type    text null,            -- e.g. 'checklist_item', 'product'
  resource_id      uuid null,
  metadata         jsonb null,           -- extra machine-readable context
  created_at       timestamptz not null default now()
);

alter table audit_log enable row level security;

-- Read: members can see their own org's log
create policy "audit_log_select" on audit_log
  for select using (
    organisation_id = (select organisation_id from profiles where id = auth.uid())
  );

-- Insert: members can add entries (server-side only via service role in practice,
-- but RLS must allow it so API routes using the user client can write)
create policy "audit_log_insert" on audit_log
  for insert with check (
    organisation_id = (select organisation_id from profiles where id = auth.uid())
  );

-- No UPDATE or DELETE policies — log is immutable

-- Indexes for the two common read patterns
create index audit_log_product_id_idx on audit_log (product_id, created_at desc)
  where product_id is not null;

create index audit_log_org_id_idx on audit_log (organisation_id, created_at desc);
