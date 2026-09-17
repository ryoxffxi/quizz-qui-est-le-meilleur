-- 0001 : tables initiales du Premium (déjà appliquées en prod le 2026-08-17).
-- Idempotent : rejouable sans effet sur une base à jour.
--   npx wrangler d1 execute quizz-premium --remote --file db/migrations/0001-initial.sql

CREATE TABLE IF NOT EXISTS entitlements (
  email              TEXT PRIMARY KEY,
  premium            INTEGER NOT NULL DEFAULT 0,
  plan               TEXT,
  stripe_customer_id TEXT,
  updated_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entitlements_customer
  ON entitlements (stripe_customer_id);

CREATE TABLE IF NOT EXISTS processed_events (
  event_id   TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
