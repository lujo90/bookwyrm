-- ─── 005: Documents ───────────────────────────────────────────────────────────
-- Evidence documents uploaded against a product.
-- Files are stored in Supabase Storage; this table tracks metadata.
-- The actual bucket ("documents") must be created in the Supabase dashboard
-- with RLS enabled so only authenticated users can read their own org's files.

create table documents (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products on delete cascade,
  organisation_id uuid not null references organisations on delete cascade,

  -- File metadata
  name            text not null,
  type            text not null
                    check (type in
                      ('spec_sheet','lab_report','certificate','declaration','other')),
  storage_path    text not null unique,         -- path inside the "documents" bucket
  mime_type       text not null,
  size_bytes      bigint not null check (size_bytes > 0),

  -- Certificate expiry (null for non-expiring documents)
  expiry_date     date null,

  uploaded_by     uuid not null references profiles on delete set null,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table documents enable row level security;

create policy "documents_select" on documents
  for select using (
    organisation_id = (select organisation_id from profiles where id = auth.uid())
  );

create policy "documents_insert" on documents
  for insert with check (
    organisation_id = (select organisation_id from profiles where id = auth.uid())
  );

create policy "documents_delete" on documents
  for delete using (
    organisation_id = (select organisation_id from profiles where id = auth.uid())
  );

create trigger documents_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- Fast lookup of all documents for a product
create index documents_product_id_idx on documents (product_id, created_at desc);

-- Wire up the FK that was left as a comment in migration 003
alter table checklist_items
  add constraint checklist_items_evidence_document_id_fkey
  foreign key (evidence_document_id) references documents (id) on delete set null;
