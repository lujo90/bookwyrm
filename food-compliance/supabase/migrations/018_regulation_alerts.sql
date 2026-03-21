-- Phase 9: Regulation change alerts per organisation / product

CREATE TABLE regulation_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  regulation_id uuid REFERENCES regulations(id),
  alert_type text DEFAULT 'regulation_update',
  message text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE regulation_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org alerts" ON regulation_alerts
  FOR ALL USING (organisation_id IN (
    SELECT organisation_id FROM profiles WHERE id = auth.uid()
  ));
