-- Schéma COMPLET de la base D1 `quizz-premium` (état courant). Idempotent :
-- peut être rejoué sur une base existante sans rien casser.
-- Historique des évolutions : db/migrations/ (0001 = tables initiales, 0002 = events).
--
-- Application :
--   npx wrangler d1 execute quizz-premium --file db/schema.sql            (local, wrangler dev)
--   npx wrangler d1 execute quizz-premium --remote --file db/schema.sql   (prod)

-- Qui a payé : source de vérité de l'entitlement « sans pub ». L'email vient de
-- Stripe Checkout (webhook signé ou session relue payée). Le client n'est JAMAIS
-- de confiance.
CREATE TABLE IF NOT EXISTS entitlements (
  email              TEXT PRIMARY KEY,           -- email en minuscules
  premium            INTEGER NOT NULL DEFAULT 0, -- 1 = sans pub actif
  plan               TEXT,                       -- 'monthly' | 'lifetime'
  stripe_customer_id TEXT,                       -- annulations, impayés, portail client
  updated_at         TEXT NOT NULL
);

-- Recherche par client Stripe (customer.subscription.*, remboursements, portail).
CREATE INDEX IF NOT EXISTS idx_entitlements_customer
  ON entitlements (stripe_customer_id);

-- Idempotence : Stripe rejoue les webhooks (clé = event.id) ; /api/confirm
-- n'accorde qu'une fois par session (clé = 'confirm:<session_id>').
CREATE TABLE IF NOT EXISTS processed_events (
  event_id   TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);

-- Mesure d'usage sans cookie ni identifiant (POST /api/ev) : un compteur par
-- (jour UTC, événement, contexte). Aucune IP, aucun user-agent, rien de personnel.
-- Le Worker la crée aussi à la volée (CREATE TABLE IF NOT EXISTS) au premier /api/ev.
CREATE TABLE IF NOT EXISTS events (
  day  TEXT NOT NULL,                 -- 'YYYY-MM-DD' (UTC)
  name TEXT NOT NULL,                 -- liste blanche (worker/index.js EVENT_NAMES)
  ctx  TEXT NOT NULL DEFAULT '',      -- contexte court [a-z0-9_-]{0,32}
  n    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, name, ctx)
);
