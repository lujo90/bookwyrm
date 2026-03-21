-- Phase 9: Regulations database

CREATE TABLE regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  title text NOT NULL,
  summary text,
  applies_to text[] DEFAULT '{}',
  markets text[] DEFAULT '{}',
  channels text[] DEFAULT '{}',
  certifications text[] DEFAULT '{}',
  checklist_item_refs text[] DEFAULT '{}',
  official_url text,
  effective_date date,
  last_updated timestamptz DEFAULT now(),
  version integer DEFAULT 1,
  status text DEFAULT 'active',
  ai_confidence_score numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE regulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read regulations" ON regulations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage regulations" ON regulations
  FOR ALL USING (auth.role() = 'service_role');
