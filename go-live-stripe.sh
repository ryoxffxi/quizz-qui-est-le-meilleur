#!/bin/bash
# Mise en service Stripe du Premium Quizz : à lancer par RYO dans SON Terminal.
# La clé secrète ne vit qu'en mémoire le temps du script : rien n'est écrit sur
# disque, rien ne passe par le chat. REJOUABLE sans doublon : tarifs retrouvés
# par lookup_key, webhook remplacé proprement, SESSION_SECRET conservé.
#
# Étapes :
#   0. pré-vol : wrangler connecté, dépôt git propre
#   1. vérifie la clé auprès de Stripe (sk_test_ par défaut, sk_live_ avec --live)
#   2. crée ou retrouve les 2 tarifs : 2 EUR/mois et 9,99 EUR à vie
#   3. crée le NOUVEAU webhook https://ryo-offc.com/api/webhook (7 événements),
#      pose les secrets sur le Worker, PUIS supprime l'ancien webhook
#   4. SESSION_SECRET : généré seulement s'il n'existe pas encore sur le Worker
#      (le régénérer déconnecterait tous les acheteurs)
#   5. schéma D1 à jour (idempotent) ; portail client Stripe activé si besoin
#   6. (--live) export de la D1, purge des entitlements de test (sur confirmation),
#      bascule PREMIUM_LIVE=true + tarifs live, commit et push (déploiement GitHub)
#
# Usage :
#   bash go-live-stripe.sh          # mode TEST (sandbox Stripe, aucun argent)
#   bash go-live-stripe.sh --live   # VRAI ARGENT (compte Stripe activé requis)
set -euo pipefail
cd "$(dirname "$0")"

py() { python3 -c "$1"; }
# wrangler est une devDependency épinglée (package-lock) : même version qu'en CI.
WRANGLER="npx wrangler"
DB_NAME="quizz-premium"
SITE="https://ryo-offc.com"
WEBHOOK_URL="$SITE/api/webhook"
# Événements traités par worker/index.js (applyStripeEvent). Un événement listé
# ici mais non géré par le Worker est inoffensif (ignoré, marqué traité).
WEBHOOK_EVENTS=(
  checkout.session.completed      # octroi du premium (kind=premium uniquement)
  customer.subscription.updated   # impayé / pause -> coupe ; retour actif -> rétablit
  customer.subscription.deleted   # annulation -> coupe le mensuel
  invoice.payment_failed          # journal seulement (visible dans l'observabilité)
  charge.refunded                 # remboursement intégral -> révoque (même à vie)
  charge.dispute.created          # litige -> révoque
  charge.dispute.closed           # litige gagné -> rétablit
)

# Mode : par défaut TEST (sandbox). `--live` = VRAI ARGENT (compte Stripe activé requis).
MODE="test"
[ "${1:-}" = "--live" ] && MODE="live"

# --- 0. Pré-vol ---------------------------------------------------------------
echo "→ Pré-vol : wrangler connecté à Cloudflare ?"
if ! WHO=$($WRANGLER whoami 2>&1) || printf '%s' "$WHO" | grep -qi "not authenticated"; then
  echo "⛔ wrangler n'est pas connecté. Lance d'abord :  npx wrangler login"
  exit 1
fi
echo "   OK"

echo "→ Pré-vol : dépôt git propre ?"
if [ -n "$(git status --porcelain)" ]; then
  echo "⛔ Des fichiers sont modifiés ou non suivis (git status). Commite ou range d'abord :"
  echo "   le mode --live commite lui-même wrangler.jsonc et src/lib/premium.js, rien d'autre."
  exit 1
fi
echo "   OK"

if [ "$MODE" = "live" ]; then
  echo "⚠️  MODE LIVE : les paiements seront RÉELS (vrais clients, vraies cartes)."
  echo "   Prérequis : compte Stripe ACTIVÉ (identité + IBAN vérifiés), voir PREMIUM-SETUP.md."
  read -r -p "   Tape LIVE en majuscules pour confirmer : " CONFIRM
  [ "$CONFIRM" = "LIVE" ] || { echo "⛔ Annulé."; exit 1; }
  echo "→ Mise à jour du code (git pull)..."
  git pull --ff-only origin main 2>/dev/null || echo "   (pull impossible, on continue avec la version locale)"
  read -r -s -p "Colle ta clé secrète Stripe LIVE (sk_live_...) puis Entrée : " SK
  echo ""
  case "$SK" in
    sk_live_*) ;;
    *) echo "⛔ Ce n'est pas une clé sk_live_ : abandon."; exit 1 ;;
  esac
else
  read -r -s -p "Colle ta clé secrète Stripe TEST (sk_test_...) puis Entrée : " SK
  echo ""
  case "$SK" in
    sk_test_*) ;;
    *) echo "⛔ Ce n'est pas une clé sk_test_ : abandon (lance avec --live pour le vrai argent)."; exit 1 ;;
  esac
fi

# --- 1. Clé -------------------------------------------------------------------
echo "→ Vérification de la clé auprès de Stripe..."
ACCT=$(curl -s -u "$SK:" https://api.stripe.com/v1/account | py 'import json,sys; d=json.load(sys.stdin); print(d.get("id") or d.get("error",{}).get("message","ERREUR"))')
case "$ACCT" in
  acct_*) echo "   OK (compte $ACCT)" ;;
  *) echo "⛔ Clé refusée par Stripe : $ACCT"; exit 1 ;;
esac

# --- 2. Tarifs (idempotent via lookup_key) ------------------------------------
echo "→ Recherche de tarifs déjà créés (lookup_key quizz_monthly / quizz_lifetime)..."
EXISTING=$(curl -s -u "$SK:" -G https://api.stripe.com/v1/prices \
  -d "lookup_keys[]=quizz_monthly" -d "lookup_keys[]=quizz_lifetime" -d active=true)
P_MONTH=$(printf '%s' "$EXISTING" | py 'import json,sys; d=json.load(sys.stdin); print(next((p["id"] for p in d.get("data",[]) if p.get("lookup_key")=="quizz_monthly"),""))')
P_LIFE=$(printf '%s' "$EXISTING" | py 'import json,sys; d=json.load(sys.stdin); print(next((p["id"] for p in d.get("data",[]) if p.get("lookup_key")=="quizz_lifetime"),""))')

if [ -z "$P_MONTH" ]; then
  echo "→ Création du tarif MENSUEL (2,00 EUR / mois)..."
  P_MONTH=$(curl -s -u "$SK:" https://api.stripe.com/v1/prices \
    -d "product_data[name]=Quizz Premium (sans pub) - Mensuel" \
    -d unit_amount=200 -d currency=eur \
    -d "recurring[interval]=month" \
    -d lookup_key=quizz_monthly \
    | py 'import json,sys; d=json.load(sys.stdin); print(d.get("id") or d.get("error",{}).get("message","ERREUR"))')
fi
case "$P_MONTH" in price_*) echo "   Mensuel : $P_MONTH" ;; *) echo "⛔ Échec tarif mensuel : $P_MONTH"; exit 1 ;; esac

if [ -z "$P_LIFE" ]; then
  echo "→ Création du tarif A VIE (9,99 EUR, paiement unique)..."
  P_LIFE=$(curl -s -u "$SK:" https://api.stripe.com/v1/prices \
    -d "product_data[name]=Quizz Premium (sans pub) - A vie" \
    -d unit_amount=999 -d currency=eur \
    -d lookup_key=quizz_lifetime \
    | py 'import json,sys; d=json.load(sys.stdin); print(d.get("id") or d.get("error",{}).get("message","ERREUR"))')
fi
case "$P_LIFE" in price_*) echo "   A vie : $P_LIFE" ;; *) echo "⛔ Échec tarif à vie : $P_LIFE"; exit 1 ;; esac

# --- 3. Webhook : le nouveau AVANT de supprimer l'ancien ----------------------
# Pendant le recouvrement, chaque événement est livré aux deux endpoints ; le
# Worker est idempotent par event.id, donc aucun double traitement.
echo "→ Webhook : recherche d'un endpoint existant sur $WEBHOOK_URL..."
OLD_WH=$(curl -s -u "$SK:" -G https://api.stripe.com/v1/webhook_endpoints -d limit=100 \
  | py "import json,sys; d=json.load(sys.stdin); print(next((w['id'] for w in d.get('data',[]) if w.get('url')=='$WEBHOOK_URL'),''))")
[ -n "$OLD_WH" ] && echo "   Ancien webhook $OLD_WH trouvé : supprimé APRÈS la mise en place du nouveau."

echo "→ Création du NOUVEAU webhook (${#WEBHOOK_EVENTS[@]} événements)..."
EV_ARGS=()
for ev in "${WEBHOOK_EVENTS[@]}"; do EV_ARGS+=(-d "enabled_events[]=$ev"); done
WH=$(curl -s -u "$SK:" https://api.stripe.com/v1/webhook_endpoints \
  -d url="$WEBHOOK_URL" \
  "${EV_ARGS[@]}" \
  -d description="Quizz premium (entitlement D1)")
WH_ID=$(printf '%s' "$WH" | py 'import json,sys; d=json.load(sys.stdin); print(d.get("id",""))')
WHSEC=$(printf '%s' "$WH" | py 'import json,sys; d=json.load(sys.stdin); print(d.get("secret",""))')
case "$WHSEC" in
  whsec_*) echo "   OK ($WH_ID créé, secret de signature récupéré)" ;;
  *) echo "⛔ Échec création webhook, réponse Stripe :"; printf '%s\n' "$WH"; exit 1 ;;
esac

echo "→ Pose des secrets Stripe sur le Worker Cloudflare (quizz-qui-est-le-meilleur)..."
printf '%s' "$SK"    | $WRANGLER secret put STRIPE_SECRET_KEY
printf '%s' "$WHSEC" | $WRANGLER secret put STRIPE_WEBHOOK_SECRET

if [ -n "$OLD_WH" ] && [ "$OLD_WH" != "$WH_ID" ]; then
  echo "→ Suppression de l'ancien webhook $OLD_WH (le nouveau est en place, son secret est posé)..."
  curl -s -u "$SK:" -X DELETE "https://api.stripe.com/v1/webhook_endpoints/$OLD_WH" > /dev/null
fi

# --- 4. SESSION_SECRET : seulement s'il manque ----------------------------------
echo "→ SESSION_SECRET : déjà présent sur le Worker ?"
if $WRANGLER secret list 2>/dev/null | grep -q '"SESSION_SECRET"'; then
  echo "   Oui : conservé (les jetons des acheteurs restent valides)."
else
  echo "   Non : génération d'un secret aléatoire (jamais affiché)..."
  openssl rand -hex 32 | $WRANGLER secret put SESSION_SECRET
fi

# --- 5. Schéma D1 (idempotent) + portail client Stripe ------------------------
echo "→ Schéma D1 à jour (CREATE TABLE IF NOT EXISTS : sans effet si déjà appliqué)..."
$WRANGLER d1 execute "$DB_NAME" --remote -y --file db/schema.sql > /dev/null

# Le portail client (POST /api/portal) exige une configuration par défaut côté
# Stripe. On la crée par l'API si elle manque ; à vérifier ensuite dans le
# tableau de bord (Paramètres > Facturation > Portail client).
echo "→ Portail client Stripe : configuration par défaut présente ?"
HAS_PORTAL=$(curl -s -u "$SK:" -G https://api.stripe.com/v1/billing_portal/configurations -d is_default=true -d limit=1 \
  | py 'import json,sys; d=json.load(sys.stdin); print("oui" if d.get("data") else "non")')
if [ "$HAS_PORTAL" = "oui" ]; then
  echo "   Oui : rien à faire."
else
  echo "   Non : création (annulation en fin de période, factures, moyen de paiement)..."
  PORTAL=$(curl -s -u "$SK:" https://api.stripe.com/v1/billing_portal/configurations \
    --data-urlencode "business_profile[headline]=Quizz : gérer ton abonnement sans pub" \
    -d "default_return_url=$SITE/?portail=retour" \
    -d "features[invoice_history][enabled]=true" \
    -d "features[payment_method_update][enabled]=true" \
    -d "features[subscription_cancel][enabled]=true" \
    -d "features[subscription_cancel][mode]=at_period_end" \
    | py 'import json,sys; d=json.load(sys.stdin); print(d.get("id") or d.get("error",{}).get("message","ERREUR"))')
  case "$PORTAL" in
    bpc_*) echo "   OK ($PORTAL). Vérifie qu'il est bien « par défaut » dans le tableau de bord Stripe." ;;
    *) echo "   ⚠️  Impossible par l'API ($PORTAL) : active le portail à la main (voir PREMIUM-SETUP.md)." ;;
  esac
fi

# --- 6. Bascule LIVE (pensée pour être lancée SANS Claude) ------------------
if [ "$MODE" = "live" ]; then
  # 6a. Sauvegarde de la base (état de test) HORS du dépôt : elle contient les
  #     emails des achats sandbox, rien de tout ça ne doit finir dans git.
  BK_DIR="$HOME/Quizz-sauvegardes"
  mkdir -p "$BK_DIR"
  BK="$BK_DIR/$DB_NAME-avant-live-$(date +%Y%m%d-%H%M%S).sql"
  echo "→ Export de la base D1 avant bascule : $BK"
  $WRANGLER d1 export "$DB_NAME" --remote -y --output "$BK" > /dev/null

  # 6b. Purge des entitlements de TEST : sans elle, un email ayant « acheté » en
  #     sandbox garderait le sans-pub gratuitement en live. La table events
  #     (compteurs anonymes) est conservée.
  echo "→ Purge des entitlements de test (achats sandbox) ?"
  read -r -p "   Purger maintenant, la sauvegarde ci-dessus étant faite ? [o/N] " PURGE
  if [ "$PURGE" = "o" ] || [ "$PURGE" = "O" ]; then
    $WRANGLER d1 execute "$DB_NAME" --remote -y --command "DELETE FROM entitlements; DELETE FROM processed_events;" > /dev/null
    echo "   Purgé."
  else
    echo "   Non purgé. À faire avant le premier vrai client :"
    echo "   npx wrangler d1 execute $DB_NAME --remote --command \"DELETE FROM entitlements; DELETE FROM processed_events;\""
  fi

  # 6c. Bascule du site en paiements réels.
  echo "→ Bascule du site en paiements réels..."
  perl -pi -e "s/\"PRICE_MONTHLY\": \"price_[A-Za-z0-9]+\"/\"PRICE_MONTHLY\": \"$P_MONTH\"/" wrangler.jsonc
  perl -pi -e "s/\"PRICE_LIFETIME\": \"price_[A-Za-z0-9]+\"/\"PRICE_LIFETIME\": \"$P_LIFE\"/" wrangler.jsonc
  perl -pi -e "s/export const PREMIUM_LIVE = false/export const PREMIUM_LIVE = true/" src/lib/premium.js
  grep -q "$P_MONTH" wrangler.jsonc || { echo "⛔ Échec mise à jour wrangler.jsonc"; exit 1; }
  grep -q "$P_LIFE" wrangler.jsonc || { echo "⛔ Échec mise à jour wrangler.jsonc"; exit 1; }
  grep -q 'PREMIUM_LIVE = true' src/lib/premium.js || { echo "⛔ Échec bascule PREMIUM_LIVE"; exit 1; }

  echo "→ Build du site..."
  npm run build > /dev/null 2>&1 || { echo "⛔ Le build a échoué : demande de l'aide à une IA (codex/agy)."; exit 1; }

  echo "→ Publication (le déploiement se fait tout seul via GitHub, ~1 min)..."
  git add wrangler.jsonc src/lib/premium.js
  git commit -m "GO LIVE : paiements réels activés (tarifs live + PREMIUM_LIVE=true)" > /dev/null
  git push origin main || { echo "⛔ Push refusé. Réessaie : git push origin main"; exit 1; }

  echo ""
  echo "══════════════════════════════════════════════════════════════"
  echo "🎉 C'EST PARTI ! Dans ~1 minute, ryo-offc.com accepte les VRAIS paiements."
  echo "   La couronne 👑 et le bouton Soutenir 💜 réapparaissent ENSEMBLE."
  echo ""
  echo "   À FAIRE À LA MAIN, MAINTENANT (voir PREMIUM-SETUP.md, runbook) :"
  echo "   1. Cloudflare > ryo-offc.com > Sécurité > WAF > Rate limiting rules :"
  echo "      /api/(checkout|donate|confirm|portal) limité à 10 requêtes / 10 s par IP"
  echo "   2. Stripe > Paramètres > Facturation > Portail client : vérifier « par défaut »"
  echo ""
  echo "   DERNIER TEST À FAIRE TOI-MÊME (~3 min, avec ta vraie carte) :"
  echo "   1. Recharge ryo-offc.com, couronne 👑, achète « À vie » 9,99 EUR"
  echo "   2. La couronne doit disparaître (premium actif)"
  echo "   3. dashboard.stripe.com > Paiements > ton 9,99 EUR > Rembourser (total)"
  echo "   4. Recharge le site : la couronne doit REVENIR (premium bien coupé)"
  echo "   Si les 4 points passent : tout est validé, tu t'es remboursé, zéro frais perdu"
  echo "   (hors ~0,40 EUR de frais Stripe non restitués : le prix du test réel)."
  echo "   Rapport d'usage ensuite : npm run events"
  echo "══════════════════════════════════════════════════════════════"
else
  echo ""
  echo "══════════════════════════════════════════════════════════════"
  echo "✅ Terminé (mode test). Identifiants PUBLICS des tarifs (à mettre dans wrangler.jsonc) :"
  echo "   MENSUEL : $P_MONTH"
  echo "   A VIE   : $P_LIFE"
  echo "   Webhook : $WH_ID (${#WEBHOOK_EVENTS[@]} événements)"
  echo "══════════════════════════════════════════════════════════════"
fi
