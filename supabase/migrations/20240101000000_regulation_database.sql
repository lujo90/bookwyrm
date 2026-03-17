-- Migration: Regulation Database Layer
-- Creates tables for storing food compliance regulations, version history,
-- and an AI-assisted review queue for EUR-Lex documents.

-- ============================================================
-- TABLE: regulations
-- ============================================================
CREATE TABLE IF NOT EXISTS regulations (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text        NOT NULL,                          -- e.g. "EU 1169/2011"
  title                 text        NOT NULL,                          -- Full regulation title
  summary               text,                                          -- Plain-language summary
  applies_to            text[],                                        -- Product categories
  markets               text[],                                        -- e.g. ["EU", "UK"]
  channels              text[],                                        -- e.g. ["retail", "dtc"]
  certifications        text[],                                        -- e.g. ["organic", "vegan"]
  checklist_item_refs   text[],                                        -- Checklist items this validates
  official_url          text,                                          -- EUR-Lex source link
  effective_date        date,
  last_updated          timestamptz NOT NULL DEFAULT now(),
  version               integer     NOT NULL DEFAULT 1,
  status                text        NOT NULL DEFAULT 'active'          -- active | superseded | under_review
                          CHECK (status IN ('active', 'superseded', 'under_review')),
  ai_confidence_score   numeric     CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1),
  created_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE regulations IS 'Master table of food compliance regulations.';
COMMENT ON COLUMN regulations.code IS 'Short regulatory code, e.g. "EU 1169/2011".';
COMMENT ON COLUMN regulations.status IS 'Lifecycle status: active | superseded | under_review.';
COMMENT ON COLUMN regulations.ai_confidence_score IS 'Confidence score (0–1) assigned during AI interpretation.';

-- ============================================================
-- TABLE: regulation_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS regulation_versions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  regulation_id       uuid        NOT NULL REFERENCES regulations (id) ON DELETE CASCADE,
  version             integer     NOT NULL,
  summary             text,
  change_description  text,
  changed_at          timestamptz NOT NULL DEFAULT now(),
  changed_by          text
);

COMMENT ON TABLE regulation_versions IS 'Audit history of changes made to regulations.';

-- Index for fast version lookups per regulation
CREATE INDEX IF NOT EXISTS regulation_versions_regulation_id_idx
  ON regulation_versions (regulation_id, version DESC);

-- ============================================================
-- TABLE: regulation_review_queue
-- ============================================================
CREATE TABLE IF NOT EXISTS regulation_review_queue (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  eurlex_document_url     text,
  eurlex_celex_number     text,
  raw_text                text,                                          -- Full document text from EUR-Lex
  ai_interpretation       jsonb,                                         -- Structured AI output
  proposed_regulation_id  uuid        REFERENCES regulations (id),       -- Nullable: update to existing reg
  is_new_regulation       boolean     NOT NULL DEFAULT true,
  status                  text        NOT NULL DEFAULT 'pending'          -- pending | approved | rejected | edited
                            CHECK (status IN ('pending', 'approved', 'rejected', 'edited')),
  reviewer_notes          text,
  reviewed_by             text,
  reviewed_at             timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE regulation_review_queue IS 'Queue for AI-parsed EUR-Lex documents awaiting human review.';
COMMENT ON COLUMN regulation_review_queue.ai_interpretation IS 'Structured JSON output produced by the AI reading step.';

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS regulation_review_queue_status_idx
  ON regulation_review_queue (status, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE regulations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_versions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulation_review_queue ENABLE ROW LEVEL SECURITY;

-- regulations: authenticated users can read active/superseded/under_review rows
CREATE POLICY "Authenticated users can read regulations"
  ON regulations
  FOR SELECT
  TO authenticated
  USING (true);

-- regulations: only service role can insert/update/delete (no policy needed;
-- service role bypasses RLS by default in Supabase)

-- regulation_versions: authenticated users can read
CREATE POLICY "Authenticated users can read regulation versions"
  ON regulation_versions
  FOR SELECT
  TO authenticated
  USING (true);

-- regulation_review_queue: no public/authenticated policies —
-- access is restricted to the service role, which bypasses RLS.
-- Explicitly deny all other roles:
CREATE POLICY "Deny all non-service access to review queue"
  ON regulation_review_queue
  FOR ALL
  TO authenticated
  USING (false);
