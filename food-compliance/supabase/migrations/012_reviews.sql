-- Phase 12: Review Flow
-- Stores guided review sessions and per-step confirmations.

CREATE TABLE reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid REFERENCES products(id) ON DELETE CASCADE,
  status        text DEFAULT 'in_progress',
  started_at    timestamptz DEFAULT now(),
  completed_at  timestamptz,
  completed_by  text,
  current_step  integer DEFAULT 0,
  total_steps   integer,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE review_confirmations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id     uuid REFERENCES reviews(id) ON DELETE CASCADE,
  step          integer,
  item_type     text,
  item_id       uuid,
  question      text,
  confirmed     boolean,
  confirmed_at  timestamptz DEFAULT now(),
  confirmed_by  text,
  note          text
);

-- RLS: scoped to organisation via product chain

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own reviews" ON reviews FOR ALL
  USING (product_id IN (
    SELECT id FROM products WHERE organisation_id IN (
      SELECT organisation_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users see own confirmations" ON review_confirmations FOR ALL
  USING (review_id IN (
    SELECT id FROM reviews WHERE product_id IN (
      SELECT id FROM products WHERE organisation_id IN (
        SELECT organisation_id FROM profiles WHERE id = auth.uid()
      )
    )
  ));

-- Index for fast lookup of active review per product
CREATE INDEX idx_reviews_product_status ON reviews(product_id, status);
