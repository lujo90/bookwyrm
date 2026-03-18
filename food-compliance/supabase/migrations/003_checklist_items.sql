-- ─── 003: Checklist Items ────────────────────────────────────────────────────
-- Auto-generated compliance checklist tasks for a product.
-- Regulation data is stored inline (not normalised) so items remain meaningful
-- even if the regulation reference table changes.

create table checklist_items (
  id                      uuid primary key default gen_random_uuid(),
  product_id              uuid not null references products on delete cascade,
  organisation_id         uuid not null references organisations on delete cascade,

  -- Categorisation
  category                text not null
                            check (category in
                              ('formula','compliance','documents','packaging','suppliers')),
  sort_order              integer not null default 0,

  -- Content
  title                   text not null,
  help_text               text null,
  weight                  integer not null default 10
                            check (weight > 0),

  -- Completion
  blocking                boolean not null default false,
  completed               boolean not null default false,
  completed_at            timestamptz null,
  completed_by            text null,   -- email of completing user (not FK)

  -- Inline regulation reference (all nullable — not every item has one)
  regulation_code         text null,   -- e.g. "EU 1169/2011"
  regulation_article      text null,   -- e.g. "Article 9(1)(c)"
  regulation_explanation  text null,   -- plain-English summary
  regulation_url          text null,   -- EUR-Lex link

  -- Optional link to an uploaded evidence document
  evidence_document_id    uuid null,   -- FK added in Phase 5 (documents table)

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table checklist_items enable row level security;

create policy "checklist_select" on checklist_items
  for select using (
    organisation_id = (select organisation_id from profiles where id = auth.uid())
  );

create policy "checklist_insert" on checklist_items
  for insert with check (
    organisation_id = (select organisation_id from profiles where id = auth.uid())
  );

create policy "checklist_update" on checklist_items
  for update using (
    organisation_id = (select organisation_id from profiles where id = auth.uid())
  );

create trigger checklist_items_updated_at
  before update on checklist_items
  for each row execute function set_updated_at();

-- Indexes for the two common query patterns
create index checklist_product_id_idx on checklist_items (product_id);
create index checklist_org_incomplete_idx
  on checklist_items (organisation_id, blocking desc, weight desc)
  where completed = false;
