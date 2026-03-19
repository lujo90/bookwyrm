-- ─── 013: Supply Chain Events — Add UPDATE policy ─────────────────────────────
-- The 009 migration created supply_chain_events as append-only, but the
-- resolved_at column needs to be settable by org members so that dashboard
-- alerts can be dismissed.

CREATE POLICY "supply_chain_events: org members can update"
  ON supply_chain_events FOR UPDATE
  USING (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));
