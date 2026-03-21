-- Phase 9: EU-Lex monitoring job log

CREATE TABLE monitoring_job_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text,
  run_at timestamptz DEFAULT now(),
  documents_found integer DEFAULT 0,
  documents_queued integer DEFAULT 0,
  error_text text
);
