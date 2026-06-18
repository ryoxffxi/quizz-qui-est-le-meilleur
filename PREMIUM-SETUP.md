# Mise en service du Premium (sans pub) — Stripe + Cloudflare Worker + D1

Backend vérifié côté serveur. Le navigateur n'est jamais de confiance : l'entitlement
vit en base **D1**, inscrit uniquement via un **webhook Stripe signé** ou une **session
Stripe vérifiée payée**. Le code est dans `worker/index.js` et `db/schema.sql`.

> ⚠️ Tant que ces étapes ne sont pas faites, le site reste 100 % statique et le bouton
> « Passer sans pub » retombe sur « bientôt disponible » (aucune casse). N'applique la
> config `wrangler.jsonc` (étape 4) **qu'après** avoir créé la D1 et posé les secrets.

## 1. Stripe (mode test) — produits → price IDs
Dashboard Stripe (Mode test) → Catalogue de produits → créer :
- **Quizz Premium — Mensuel** : récurrent, 2,00 €/mois → noter le `price_…`
- **Quizz Premium — À vie** : paiement unique, 9,99 € → noter le `price_…`

Récupérer aussi la clé **secrète** de test `sk_test_…` (Développeurs → Clés API).

## 2. Base D1
```bash
npx wrangler d1 create quizz-premium          # -> note le database_id renvoyé
npx wrangler d1 execute quizz-premium --file db/schema.sql            # local
npx wrangler d1 execute quizz-premium --remote --file db/schema.sql   # prod
```

## 3. Secrets (jamais en clair dans le repo)
```bash
npx wrangler secret put STRIPE_SECRET_KEY       # colle la sk_test_… (puis sk_live_ en prod)
npx wrangler secret put STRIPE_WEBHOOK_SECRET    # voir étape 5 (whsec_…)
npx wrangler secret put SESSION_SECRET           # une longue chaîne aléatoire (ex: openssl rand -hex 32)
```

## 4. `wrangler.jsonc` — activer le Worker (APRÈS étapes 2 et 3)
Remplacer le contenu actuel par :
```jsonc
{
  "name": "quizz-qui-est-le-meilleur",
  "compatibility_date": "2025-01-01",
  "workers_dev": false,
  "main": "worker/index.js",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "single-page-application",
    "binding": "ASSETS"
  },
  "vars": {
    "PRICE_MONTHLY": "price_REMPLACER_MENSUEL",
    "PRICE_LIFETIME": "price_REMPLACER_AVIE"
  },
  "d1_databases": [
    { "binding": "DB", "database_name": "quizz-premium", "database_id": "REMPLACER_PAR_LE_DATABASE_ID" }
  ]
}
```
Le binding `ASSETS` sert la SPA pour toute route hors `/api/*` (le Worker délègue à
`env.ASSETS.fetch`). Le `not_found_handling` reste géré par les assets.

## 5. Webhook Stripe
Dashboard Stripe → Développeurs → Webhooks → Ajouter un endpoint :
- URL : `https://ryo-offc.com/api/webhook`
- Événements : `checkout.session.completed` et `customer.subscription.deleted`
- Copier le **secret de signature** `whsec_…` → le poser via `wrangler secret put STRIPE_WEBHOOK_SECRET`.

## 6. Déployer + tester
```bash
npm run build && npx wrangler deploy
```
Test (mode test Stripe, carte `4242 4242 4242 4242`) :
1. Cliquer « Passer sans pub » → Stripe Checkout → payer.
2. Retour sur `…/?premium=success&session_id=…` → le front appelle `/api/confirm`,
   reçoit un jeton, et passe en sans-pub. Le webhook a aussi écrit l'entitlement en D1.
3. Recharger : `/api/entitlement` (avec le jeton) confirme le statut depuis D1.

## Endpoints du Worker
- `POST /api/checkout` `{plan:'monthly'|'lifetime'}` → `{url}` (Stripe Checkout)
- `POST /api/webhook` → vérifie la signature, écrit l'entitlement en D1
- `GET /api/confirm?session_id=…` → vérifie la session payée, renvoie `{premium, token}`
- `GET /api/entitlement` (header `Authorization: Bearer <token>`) → `{premium}` relu en D1

## Increment 2 (plus tard) — connexion cross-appareil
Aujourd'hui : un appareil devient premium juste après le paiement (jeton via `/api/confirm`).
Pour débloquer sur un AUTRE appareil, ajouter **« Se connecter avec Google »** + **lien
magique email** : la connexion vérifie l'email, le serveur délivre le même type de jeton,
et `/api/entitlement` relit le statut en D1. (Google = OAuth gratuit à configurer ;
envoi d'emails via une offre gratuite type Resend.)

## Notes sécurité
- Secrets (sk_, whsec_, SESSION_SECRET) **uniquement** en secrets Worker, jamais dans le repo/bundle.
- Le jeton ne fait que prouver un email ; le premium est **toujours relu en D1** (révocable). TTL 90 j.
- Webhook : signature Stripe vérifiée via `crypto.subtle.verify` (temps constant), anti-rejeu 5 min
  avec timestamp validé, et **idempotence** par `event.id` (table `processed_events`).
- ⚠️ L'email saisi dans Checkout n'est PAS une preuve d'identité vérifiée. À l'**incrément 2**
  (login Google / lien magique), exiger une vérification d'email réelle avant de lier un compte
  à cet email — sinon un acheteur pourrait poser l'entitlement sur l'email d'un tiers.
- Rotation : après les tests, régénérer les clés Stripe avant de passer en live.
- Le bloquant pubs reste côté client (comme tout site à pubs) : un adblock contourne
  toujours ; l'objectif est qu'aucun déblocage gratuit ne soit offert par NOTRE interface.
