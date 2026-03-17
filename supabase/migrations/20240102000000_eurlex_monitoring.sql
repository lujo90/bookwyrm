-- Migration: EUR-Lex Monitoring System
-- Adds:
--   1. monitoring_job_log table
--   2. 'ai_processed' value to regulation_review_queue.status constraint
--   3. check_eurlex_updates() PL/pgSQL function (called by pg_cron daily)
--
-- Requires the `http` extension for synchronous outbound HTTP calls.
-- Enable it once in the Supabase SQL editor if not already present:
--   CREATE EXTENSION IF NOT EXISTS http;

CREATE EXTENSION IF NOT EXISTS http;

-- ============================================================
-- TABLE: monitoring_job_log
-- ============================================================
CREATE TABLE IF NOT EXISTS monitoring_job_log (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name          text        NOT NULL,
  run_at            timestamptz NOT NULL DEFAULT now(),
  documents_found   integer     NOT NULL DEFAULT 0,
  documents_queued  integer     NOT NULL DEFAULT 0,
  error_text        text        -- null means clean run
);

COMMENT ON TABLE monitoring_job_log IS
  'Audit log for scheduled monitoring jobs such as check_eurlex_updates.';

-- Only the service role writes and reads this table.
ALTER TABLE monitoring_job_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all non-service access to job log"
  ON monitoring_job_log
  FOR ALL
  TO authenticated
  USING (false);

CREATE INDEX IF NOT EXISTS monitoring_job_log_run_at_idx
  ON monitoring_job_log (job_name, run_at DESC);

-- ============================================================
-- EXTEND regulation_review_queue.status CHECK to add 'ai_processed'
-- ============================================================
-- Drop the existing named constraint and replace it with one that
-- includes the new status value written by the queue processor.
ALTER TABLE regulation_review_queue
  DROP CONSTRAINT IF EXISTS regulation_review_queue_status_check;

ALTER TABLE regulation_review_queue
  ADD CONSTRAINT regulation_review_queue_status_check
  CHECK (status IN ('pending', 'ai_processed', 'approved', 'rejected', 'edited'));

-- ============================================================
-- FUNCTION: check_eurlex_updates
-- ============================================================
-- Searches EUR-Lex for recent food/labelling/packaging/additive
-- regulations, deduplicates against the existing tables, fetches
-- full document text for new ones, and enqueues them for AI review.
--
-- Designed to be invoked by pg_cron; all errors are caught and
-- recorded in monitoring_job_log so the cron job never hard-fails.
-- ============================================================
CREATE OR REPLACE FUNCTION check_eurlex_updates()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- EUR-Lex RSS search base URL.
  -- format=rss returns XML parseable by PostgreSQL's xpath().
  v_base_url      constant text :=
    'https://eur-lex.europa.eu/search.html'
    || '?type=quick&lang=EN&scope=EURLEX'
    || '&or0=DTT%3ARegulation'          -- document type = Regulation
    || '&sortOne=DD&sortOneOrder=desc'  -- newest first
    || '&format=rss'
    || '&text=';

  -- EUR-Lex REST metadata endpoint; replace [CELEX] at call time.
  v_meta_base     constant text :=
    'https://eur-lex.europa.eu/eur-lex-rest/externalresource'
    || '?uri=CELEX:';

  -- Four topic searches covering the food compliance domain.
  v_search_terms  text[] := ARRAY[
    'food+labelling',
    'food+packaging',
    'food+additives',
    'food+safety+regulation'
  ];

  -- Per-loop variables
  v_term          text;
  v_search_url    text;
  v_resp          http_response;
  v_rss_xml       xml;
  v_item_links    text[];
  v_link          text;
  v_celex         text;
  v_meta_url      text;
  v_meta_resp     http_response;
  v_raw_text      text;

  -- Run-level accumulators
  v_seen_celex    text[]  := '{}';  -- dedup within this run
  v_docs_found    integer := 0;
  v_docs_queued   integer := 0;
  v_run_errors    text[]  := '{}';
  v_error_text    text;

  v_exists        boolean;
BEGIN

  FOREACH v_term IN ARRAY v_search_terms LOOP

    BEGIN  -- per-term error boundary

      v_search_url := v_base_url || v_term;

      -- --------------------------------------------------------
      -- 1. Fetch the RSS feed for this search term
      -- --------------------------------------------------------
      BEGIN
        SELECT * INTO v_resp FROM http_get(v_search_url);
      EXCEPTION WHEN OTHERS THEN
        v_run_errors := v_run_errors
          || format('[search] Network error for term "%s": %s', v_term, SQLERRM);
        CONTINUE;
      END;

      IF v_resp.status <> 200 THEN
        v_run_errors := v_run_errors
          || format('[search] HTTP %s for term "%s"', v_resp.status, v_term);
        CONTINUE;
      END IF;

      -- --------------------------------------------------------
      -- 2. Parse RSS XML
      -- --------------------------------------------------------
      BEGIN
        v_rss_xml := v_resp.content::xml;
      EXCEPTION WHEN OTHERS THEN
        v_run_errors := v_run_errors
          || format('[xml] Parse failed for term "%s": %s', v_term, SQLERRM);
        CONTINUE;
      END;

      -- Extract every <link> text node inside <item> elements.
      -- EUR-Lex RSS 2.0 uses plain <link> with the document URL as content.
      SELECT ARRAY(
        SELECT (unnest(xpath('//item/link/text()', v_rss_xml)))::text
      ) INTO v_item_links;

      -- --------------------------------------------------------
      -- 3. Process each search result
      -- --------------------------------------------------------
      FOREACH v_link IN ARRAY coalesce(v_item_links, '{}') LOOP

        -- Extract CELEX number from URLs like:
        --   https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011R1169
        v_celex := substring(v_link FROM 'CELEX:([A-Z0-9]+)');
        IF v_celex IS NULL OR v_celex = '' THEN
          CONTINUE;
        END IF;

        v_docs_found := v_docs_found + 1;

        -- Skip duplicates seen earlier in this same run
        IF v_celex = ANY(v_seen_celex) THEN
          CONTINUE;
        END IF;
        v_seen_celex := v_seen_celex || v_celex;

        -- Skip if already in regulations (matched by URL fragment) or queue
        SELECT EXISTS(
          SELECT 1 FROM regulations
           WHERE official_url LIKE '%CELEX:' || v_celex || '%'
          UNION ALL
          SELECT 1 FROM regulation_review_queue
           WHERE eurlex_celex_number = v_celex
        ) INTO v_exists;

        IF v_exists THEN
          CONTINUE;
        END IF;

        -- --------------------------------------------------------
        -- 4. Fetch full document text from EUR-Lex REST metadata API
        -- --------------------------------------------------------
        v_raw_text := NULL;
        BEGIN
          v_meta_url := v_meta_base || v_celex || '&lang=EN';
          SELECT * INTO v_meta_resp FROM http_get(v_meta_url);

          IF v_meta_resp.status = 200 THEN
            v_raw_text := v_meta_resp.content;
          ELSE
            v_run_errors := v_run_errors
              || format('[meta] HTTP %s for CELEX %s', v_meta_resp.status, v_celex);
          END IF;
        EXCEPTION WHEN OTHERS THEN
          v_run_errors := v_run_errors
            || format('[meta] Network error for CELEX %s: %s', v_celex, SQLERRM);
          -- Still enqueue the item; AI processing can be skipped for null text
        END;

        -- --------------------------------------------------------
        -- 5. Enqueue the new document
        -- --------------------------------------------------------
        INSERT INTO regulation_review_queue (
          eurlex_document_url,
          eurlex_celex_number,
          raw_text,
          is_new_regulation,
          status
        ) VALUES (
          v_link,
          v_celex,
          v_raw_text,
          true,
          'pending'
        );

        v_docs_queued := v_docs_queued + 1;

      END LOOP; -- items

    EXCEPTION WHEN OTHERS THEN
      -- Catch any unhandled error for this search term so the others still run
      v_run_errors := v_run_errors
        || format('[unhandled] term "%s": %s', v_term, SQLERRM);
    END; -- per-term error boundary

  END LOOP; -- search terms

  -- --------------------------------------------------------
  -- 6. Write job log (always, even if everything errored)
  -- --------------------------------------------------------
  IF array_length(v_run_errors, 1) > 0 THEN
    v_error_text := array_to_string(v_run_errors, ' | ');
  END IF;

  INSERT INTO monitoring_job_log (
    job_name, run_at, documents_found, documents_queued, error_text
  ) VALUES (
    'check_eurlex_updates', now(),
    v_docs_found, v_docs_queued,
    v_error_text
  );

END;
$$;

COMMENT ON FUNCTION check_eurlex_updates() IS
  'Polls EUR-Lex for new food/labelling/packaging/additive regulations and '
  'enqueues unseen documents in regulation_review_queue. Called by pg_cron.';
