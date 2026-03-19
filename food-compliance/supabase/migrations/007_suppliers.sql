-- ─── Phase 7: Suppliers ───────────────────────────────────────────────────────
-- Creates the suppliers table with full Phase 7 schema including approval
-- workflow columns.  The Supplier type was defined in database.ts earlier but
-- never migrated; this is the canonical first migration for the table.

CREATE TABLE suppliers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  name             text NOT NULL,
  country          text,                            -- free-text country name
  contact_email    text,
  certifications   text[]  NOT NULL DEFAULT '{}',  -- e.g. ["BRC","IFS","ORGANIC"]
  notes            text,

  -- Approval workflow
  approved         boolean     NOT NULL DEFAULT false,
  approval_date    timestamptz,
  review_date      date,
  risk_rating      text        NOT NULL DEFAULT 'medium',  -- 'low' | 'medium' | 'high'

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers: org members can select"
  ON suppliers FOR SELECT
  USING (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "suppliers: org members can insert"
  ON suppliers FOR INSERT
  WITH CHECK (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "suppliers: org members can update"
  ON suppliers FOR UPDATE
  USING (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "suppliers: org members can delete"
  ON suppliers FOR DELETE
  USING (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_suppliers_organisation ON suppliers(organisation_id);

CREATE TRIGGER set_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
