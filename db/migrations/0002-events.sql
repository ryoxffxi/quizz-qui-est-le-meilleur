-- 0002 : compteurs d'usage sans cookie (POST /api/ev). Idempotent.
-- Le Worker exécute ce même CREATE TABLE IF NOT EXISTS à la volée au premier
-- /api/ev : cette migration est donc FACULTATIVE et peut être appliquée avant
-- ou après le déploiement, sans ordre imposé.
--   npx wrangler d1 execute quizz-premium --remote --file db/migrations/0002-events.sql

CREATE TABLE IF NOT EXISTS events (
  day  TEXT NOT NULL,
  name TEXT NOT NULL,
  ctx  TEXT NOT NULL DEFAULT '',
  n    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, name, ctx)
);
