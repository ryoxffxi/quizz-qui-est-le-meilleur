-- Base D1 du Premium (qui a payé). Source de vérité de l'entitlement « sans pub ».
-- L'email vient de Stripe Checkout (vérifié par webhook signé) ou d'une connexion
-- vérifiée (Google / lien magique, à venir). Le client n'est JAMAIS de confiance.
CREATE TABLE IF NOT EXISTS entitlements (
  email              TEXT PRIMARY KEY,         -- email en minuscules
  premium            INTEGER NOT NULL DEFAULT 0, -- 1 = sans pub actif
  plan               TEXT,                     -- 'monthly' | 'lifetime'
  stripe_customer_id TEXT,                     -- pour gérer les annulations d'abo
  updated_at         TEXT NOT NULL
);

-- Recherche par client Stripe (annulation d'abonnement -> premium = 0).
CREATE INDEX IF NOT EXISTS idx_entitlements_customer
  ON entitlements (stripe_customer_id);
