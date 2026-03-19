-- ─── Phase 8: Packaging Record ───────────────────────────────────────────────
-- Adds label_artwork to the document_type enum, then creates the packaging
-- table (one row per product, enforced via UNIQUE on product_id).

-- ─── Extend documents.type CHECK constraint to include label_artwork ──────────
-- The documents.type column uses a text CHECK constraint (not a PostgreSQL enum),
-- so we must drop the old constraint and add a new one.

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_type_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_type_check
  CHECK (type IN ('spec_sheet', 'lab_report', 'certificate', 'declaration', 'label_artwork', 'other'));

-- ─── packaging ────────────────────────────────────────────────────────────────

CREATE TABLE packaging (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           uuid REFERENCES products(id) ON DELETE CASCADE UNIQUE,

  -- Section 1: Primary Packaging
  primary_material     text,
  weight_primary_g     numeric,
  recyclability_code   text,

  -- Section 2: Secondary Packaging
  secondary_material   text,
  weight_secondary_g   numeric,

  -- Section 3: PPWR Compliance
  ppwr_compliant       boolean,           -- true=Yes, false=No, null=Not sure
  recycled_content_pct numeric,

  -- Section 4: Label & Barcode
  label_dimensions     text,
  label_document_id    uuid REFERENCES documents(id) ON DELETE SET NULL,
  barcode              text,
  barcode_type         text NOT NULL DEFAULT 'EAN-13',

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE packaging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org packaging"
  ON packaging FOR ALL
  USING (product_id IN (
    SELECT id FROM products WHERE organisation_id IN (
      SELECT organisation_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE INDEX idx_packaging_product ON packaging(product_id);

CREATE TRIGGER set_packaging_updated_at
  BEFORE UPDATE ON packaging
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
