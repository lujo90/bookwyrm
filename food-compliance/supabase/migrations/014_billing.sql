-- Phase 14: Billing — add Stripe / trial fields to organisations
-- stripe_customer_id already exists from migration 001; skip it here.

ALTER TABLE organisations
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN trial_ends_at          timestamptz DEFAULT (now() + interval '14 days'),
  ADD COLUMN subscription_status    text        DEFAULT 'trial',
  ADD COLUMN plan                   text        DEFAULT 'trial',
  ADD COLUMN sku_limit              integer     DEFAULT 2;
