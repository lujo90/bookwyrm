-- Phase 9: EU-Lex regulation review queue

CREATE TABLE regulation_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eurlex_document_url text,
  eurlex_celex_number text,
  raw_text text,
  ai_interpretation jsonb,
  proposed_regulation_id uuid REFERENCES regulations(id),
  is_new_regulation boolean DEFAULT true,
  status text DEFAULT 'pending',
  reviewer_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE regulation_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON regulation_review_queue
  FOR ALL USING (auth.role() = 'service_role');
