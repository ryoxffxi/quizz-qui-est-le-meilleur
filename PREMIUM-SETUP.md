# Premium (sans pub) : Stripe + Cloudflare Worker + D1

Le navigateur n'est jamais de confiance. L'entitlement « sans pub » vit en base **D1**,
inscrit uniquement par un **webhook Stripe signé** ou une **Checkout Session relue chez
Stripe** (payée ET marquée `kind=premium`). Code : `worker/index.js` (routes /api),
`worker/routes.js` (routes de l'App), `db/schema.sql` + `db/migrations/`, client
`src/lib/premium.js`. Tests : `npx vitest run worker src/lib/premium.test.js`.

## État courant (2026-09-07)

**En place et vérifié (mode TEST Stripe, aucun argent réel) :**
- Worker `quizz-qui-est-le-meilleur` sur `ryo-offc.com`, déployé par GitHub Actions à
  chaque push sur `main` (`.github/workflows/deploy.yml`, `npx wrangler deploy`).
- Base D1 `quizz-premium` (région WEUR, id dans `wrangler.jsonc`) : tables
  `entitlements`, `processed_events` (migration 0001, appliquée le 2026-08-17) et
  `events` (migration 0002 ; le Worker la crée aussi à la volée au premier `/api/ev`).
- Stripe sandbox « environnement de test ryo-offc », compte `acct_1U5P2PRuYsvpBRHd` :
  tarifs test `price_1U5P8XRuYsvpBRHdbbyRTjBY` (2 EUR/mois) et
  `price_1U5P8YRuYsvpBRHdukbFsjDL` (9,99 EUR à vie), lookup_keys `quizz_monthly` /
  `quizz_lifetime`. E2E validé le 2026-08-17 : achat à vie carte 4242, premium ;
  remboursement, révocation ; webhook + confirm + idempotence.
- Secrets posés sur le Worker : `STRIPE_SECRET_KEY` (test), `STRIPE_WEBHOOK_SECRET`
  (test), `SESSION_SECRET`. Aucun secret dans le dépôt ni dans le bundle.
- `PREMIUM_LIVE = false` (`src/lib/premium.js`) : couronne, bouton Soutenir, encart
  « sans pub » et bouton de don masqués (le CTA de don affiche « bientôt disponible »).
  Le paywall existe mais n'est pas atteignable tant que ce drapeau est faux.
- `wrangler.jsonc` : `not_found_handling: "404-page"` (vraie page 404 pour les liens
  morts ; les routes de l'App sont rattrapées par le Worker) et `observability`
  activée (journaux du Worker dans le tableau de bord Cloudflare).

**Correctifs livrés dans la vague du 2026-09 (code + tests, non encore déployés en
prod tant que la vague n'est pas poussée) :**
1. Un DON n'accorde plus le premium : `kind=donation` est posé sur la Checkout Session
   elle-même (pas seulement sur le PaymentIntent), `kind=premium` + `plan` sur les
   sessions d'achat ; le webhook et `/api/confirm` n'accordent que si
   `metadata.kind === 'premium'` (`decideEntitlementFromSession`, pure, testée).
2. Octroi UNIQUE par Checkout Session (clé `confirm:<session_id>` dans
   `processed_events`, partagée par le webhook et `/api/confirm`) : rejouer l'URL de
   retour ou recevoir le webhook en retard ne ré-accorde jamais un premium révoqué
   entre-temps ; `/api/confirm` redélivre seulement le jeton et relit D1.
3. `stripe()` lève sur toute réponse non 2xx ou portant `error` ; le catch global répond
   500 (Stripe réessaie) ; un événement n'est marqué traité qu'après succès complet.
4. Cycle de vie : `customer.subscription.updated` (statut hors active/trialing coupe le
   mensuel, retour actif le rétablit), `invoice.payment_failed` (journal),
   `charge.dispute.closed` gagné (rétablit ; le mensuel seulement si l'abonnement est
   encore actif chez Stripe). Un achat « à vie » n'est jamais rétrogradé en `monthly`.
5. Réponses API en `cache-control: no-store` ; achat à vie avec `customer_creation=always`
   (client Stripe indispensable au portail et aux révocations par customer).
6. `POST /api/portal` (portail client Stripe) + `openPortal()` côté client ; retour sur
   `/?portail=retour` où le statut est resynchronisé.
7. Mesure d'usage sans cookie : `POST /api/ev` + `track()` + rapport `scripts/events-report.mjs`.
8. Routes de l'App servies en 200 avec en-têtes de durcissement ; tout le reste en 404 réel.

**Pas encore fait (voir le runbook) :** compte Stripe non activé (identité + IBAN),
statut légal, webhook live (7 événements), règle de rate limiting Cloudflare, portail
client Stripe, purge des entitlements de test, script npm `events`.

**Limite connue (plus tard, pas bloquant) :** le premium n'est débloqué que sur l'appareil
qui a payé (jeton délivré par `/api/confirm`). Pour un autre appareil, il faudra une
connexion vérifiant l'email (Google ou lien magique) avant de délivrer un jeton.

## Endpoints du Worker

| Route | Corps / en-tête | Réponse | Notes |
|---|---|---|---|
| `POST /api/checkout` | `{plan:'monthly'\|'lifetime'}` | `{url}` | Checkout Stripe, `metadata[kind]=premium`, `metadata[plan]` ; 502 si Stripe refuse |
| `POST /api/donate` | `{amount}` (EUR, 1 à 500) | `{url}` | Checkout don, `metadata[kind]=donation` (Session + PaymentIntent) ; jamais d'octroi |
| `POST /api/webhook` | en-tête `stripe-signature` | `{received, ...}` | signature HMAC (tolérance 5 min, plusieurs `v1`), idempotence par `event.id`, 500 si Stripe indisponible |
| `GET /api/confirm?session_id=cs_…` | | `{premium, token?}` | relit la session chez Stripe, octroi unique, jeton HS256 (90 j) ; 500 = à réessayer |
| `GET /api/entitlement` | `Authorization: Bearer <jeton>` | `{premium, email?}` | premium TOUJOURS relu en D1 |
| `POST /api/portal` | `Authorization: Bearer <jeton>` | `{url}` | 401 sans jeton, 404 sans client Stripe, 502 si Stripe refuse |
| `POST /api/ev` | `{e, c?}` (≤ 200 octets, même origine) | 204 | compteur (jour UTC, e, c) ; 403 autre origine, 400 hors liste, 413 trop gros |

Toute autre route `/api/*` : 404 JSON. Hors `/api` : assets statiques ; une route de l'App
(`/`, `/jouer/<cat>/<facile|expert>`, `/defi/<cat>/<facile|expert>`, `/examen`,
`/quotidien`, `/erreurs/<cat>`, `/revision/panneaux`, `/flashcards`) sans fichier physique
reçoit `index.html` en 200 avec `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN` ; tout
autre chemin inconnu reçoit `dist/404.html` en 404.

## Événements Stripe écoutés (webhook)

| Événement | Effet dans D1 |
|---|---|
| `checkout.session.completed` | octroi si `kind=premium`, payé, email connu, et session pas déjà accordée |
| `customer.subscription.updated` | statut hors {active, trialing} : premium mensuel à 0 ; retour actif depuis un statut non actif : à 1 |
| `customer.subscription.deleted` | premium mensuel à 0 (l'achat à vie du même client est intouché) |
| `invoice.payment_failed` | journal seulement (identifiants Stripe, aucun email) |
| `charge.refunded` | remboursement INTÉGRAL d'un achat : premium à 0 (même à vie) ; don : rien |
| `charge.dispute.created` | litige sur un achat : premium à 0 ; don : rien |
| `charge.dispute.closed` | statut `won` : à vie rétabli ; mensuel rétabli si l'abonnement est encore actif |

Tout autre type est accepté, ignoré et marqué traité. Les 7 événements sont posés par
`go-live-stripe.sh` (tableau `WEBHOOK_EVENTS`).

## Base D1

```bash
# Schéma complet, idempotent (CREATE ... IF NOT EXISTS) : rejouable sans risque
npx wrangler d1 execute quizz-premium --remote --file db/schema.sql       # prod
npx wrangler d1 execute quizz-premium --file db/schema.sql                # local (wrangler dev)

# Ou migration par migration (même contenu, découpé) :
npx wrangler d1 execute quizz-premium --remote --file db/migrations/0001-initial.sql
npx wrangler d1 execute quizz-premium --remote --file db/migrations/0002-events.sql
```

Ordre au déploiement : indifférent. La table `events` est créée par le Worker lui-même
au premier `/api/ev` (`CREATE TABLE IF NOT EXISTS`) ; la migration 0002 est donc
facultative, avant ou après le déploiement. `go-live-stripe.sh` rejoue `db/schema.sql`.

Sauvegarde et purge (emails de test, à faire avant le premier vrai client) :

```bash
npx wrangler d1 export quizz-premium --remote --output ~/Quizz-sauvegardes/avant-live.sql
npx wrangler d1 execute quizz-premium --remote --command "DELETE FROM entitlements; DELETE FROM processed_events;"
```

La table `events` (compteurs anonymes) se conserve. Ne jamais commiter un export : il
contient des emails.

## Mesure d'usage (sans cookie)

`track(name, ctx)` (`src/lib/analytics.js`) envoie `{e, c?}` à `POST /api/ev` par
`sendBeacon` (repli `fetch keepalive`). Noms autorisés : `solo_start`, `solo_lot_end`,
`solo_quit`, `defi_create`, `defi_open`, `defi_end`, `exam_start`, `exam_end`,
`daily_end`, `share`, `errors_replay`, `flash_session`, `pwa_install`, `error_boundary`
(liste identique côté Worker, parité testée). Contexte : `[a-z0-9_-]{1,32}`. Le Worker
stocke seulement (jour UTC, nom, contexte, compteur) : ni IP, ni user-agent, ni
identifiant, donc hors consentement.

Rapport (wrangler connecté) : `node scripts/events-report.mjs` (14 jours),
`--days 30`, `--local`. Script npm à ajouter dans `package.json` :
`"events": "node scripts/events-report.mjs"`.

## Runbook go-live (étapes restantes uniquement)

**A. Administratif, par Ryo, avant tout :**
1. Statut légal : encaisser des abonnements est une activité commerciale (micro-entreprise
   BNC au premier euro réel). Sans statut, Stripe demandera quand même une catégorie et le
   fisc une déclaration.
2. Contrat AmRest : clause de déclaration de cumul, à déclarer si le contrat l'exige.
3. Activation Stripe : tableau de bord, « Vérifier votre entreprise », informations
   EXACTES (identité, adresse, statut, IBAN). Un dossier approximatif = compte bloqué et
   fonds gelés plus tard.

**B. Technique (15 minutes, faisable sans Claude) :**
1. Prérequis : `npx wrangler login` fait, dépôt propre (`git status` vide), la vague de
   code poussée et déployée (vérifier `https://ryo-offc.com/nimporte-quoi` qui doit
   répondre 404 et `/examen` qui doit répondre 200).
2. `bash go-live-stripe.sh --live` : demande la `sk_live_`, retrouve ou crée les tarifs
   live, crée le webhook live (7 événements) AVANT de supprimer l'ancien, pose
   `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`, conserve `SESSION_SECRET`, rejoue le
   schéma D1, crée la configuration du portail client si elle manque, exporte la D1 dans
   `~/Quizz-sauvegardes/`, propose la purge des entitlements de test, écrit les
   `price_live_…` dans `wrangler.jsonc`, passe `PREMIUM_LIVE = true`, build, commit, push
   (déploiement automatique, ~1 min).
3. Cloudflare Rate Limiting (tableau de bord, domaine `ryo-offc.com`, Sécurité, WAF,
   « Rate limiting rules », 1 règle offerte sur le plan gratuit) :
   - nom : `api-paiement`
   - expression : `(http.request.uri.path matches "^/api/(checkout|donate|confirm|portal)$")`
   - caractéristique : adresse IP ; seuil : **10 requêtes / 10 secondes** ; action : bloquer
   - (le webhook `/api/webhook` et `/api/ev` n'y sont PAS : Stripe réessaie en rafale, et
     les compteurs d'usage sont bornés à 200 octets par requête)
4. Portail client Stripe : Paramètres, Facturation, « Portail client » : vérifier que la
   configuration créée par le script est « par défaut » avec annulation (fin de période),
   historique des factures et changement de moyen de paiement ; URL de retour
   `https://ryo-offc.com/?portail=retour`. Sans configuration par défaut, `/api/portal`
   répond 502.
5. Purge D1 si refusée à l'étape 2 (commande dans « Base D1 »).
6. Test réel avec ta carte : achat « À vie » 9,99 EUR, couronne disparue ; remboursement
   total depuis le tableau de bord ; rechargement, couronne revenue. Regarder le journal
   du Worker (Cloudflare, Workers, Observability ou `npx wrangler tail`) : aucune ligne
   `worker error`.
7. Après : régénérer la clé de test (Stripe, Développeurs, Clés API) qui a servi aux
   essais ; `npm run events` pour lire l'usage.

**C. Retour arrière (si quelque chose cloche) :** remettre `PREMIUM_LIVE = false` dans
`src/lib/premium.js`, commit, push. Les secrets et le webhook live peuvent rester : sans
entrée visible, personne ne peut lancer un paiement, et les webhooks restent traités.

## Notes sécurité

- Secrets (`sk_`, `whsec_`, `SESSION_SECRET`) uniquement en secrets Worker, jamais dans
  le dépôt ni le bundle. `SESSION_SECRET` ne se régénère pas (les jetons de tous les
  acheteurs seraient invalidés).
- Le jeton ne prouve qu'un email ; le premium est toujours relu en D1 (révocable). TTL 90 j.
- Webhook : signature vérifiée par `crypto.subtle.verify` (temps constant), tolérance
  5 min, idempotence par `event.id`, octroi unique par session, marquage après succès.
- L'email saisi dans Checkout n'est pas une identité vérifiée : ne jamais lier un compte à
  cet email sans vérification réelle (connexion future).
- Le blocage des pubs reste côté client : un adblock contourne toujours ; l'objectif est
  qu'aucun déblocage gratuit ne soit offert par notre interface.
- Journaux : jamais d'email ni de données personnelles (identifiants Stripe seulement).
