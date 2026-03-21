-- Phase 9: Regulation version history

CREATE TABLE regulation_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id uuid REFERENCES regulations(id) ON DELETE CASCADE,
  version integer NOT NULL,
  summary text,
  change_description text,
  changed_at timestamptz DEFAULT now(),
  changed_by text
);

ALTER TABLE regulation_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read versions" ON regulation_versions
  FOR SELECT USING (auth.role() = 'authenticated');
