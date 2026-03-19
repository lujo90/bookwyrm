-- ─── Phase 7: Supply Chain Events ────────────────────────────────────────────
-- Immutable event log written whenever a supply chain disruption occurs
-- (e.g. supplier approval revoked).  Drives the dashboard alert zone and the
-- supplier history section.

CREATE TABLE supply_chain_events (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id          uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  event_type               text NOT NULL,               -- e.g. 'supplier_revoked'
  affected_supplier_id     uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  affected_ingredient_ids  uuid[]  NOT NULL DEFAULT '{}',
  affected_product_ids     uuid[]  NOT NULL DEFAULT '{}',
  cascade_items_reset      integer NOT NULL DEFAULT 0,  -- checklist items reset count

  description              text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  resolved_at              timestamptz
);

ALTER TABLE supply_chain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supply_chain_events: org members can select"
  ON supply_chain_events FOR SELECT
  USING (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "supply_chain_events: org members can insert"
  ON supply_chain_events FOR INSERT
  WITH CHECK (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));

-- Events are append-only — no UPDATE or DELETE policies

CREATE INDEX idx_sce_organisation  ON supply_chain_events(organisation_id);
CREATE INDEX idx_sce_supplier      ON supply_chain_events(affected_supplier_id);
