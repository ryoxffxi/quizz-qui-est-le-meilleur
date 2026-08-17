#!/bin/bash
# Mise en service Stripe du Premium quizz — à lancer par RYO dans SON Terminal.
# La clé ne vit qu'en mémoire le temps du script : rien n'est écrit sur disque,
# rien ne passe par le chat. Le script est REJOUABLE sans créer de doublons.
# Fait 4 choses :
#   1. vérifie la clé auprès de Stripe (mode TEST uniquement)
#   2. crée (ou retrouve) les 2 tarifs : 2 €/mois et 9,99 € à vie
#   3. crée le webhook https://ryo-offc.com/api/webhook (4 événements)
#   4. pose les 3 secrets sur le Worker Cloudflare
set -euo pipefail
cd "$(dirname "$0")"

py() { python3 -c "$1"; }

# Mode : par défaut TEST (sandbox). `--live` = VRAI ARGENT (compte Stripe activé requis).
MODE="test"
[ "${1:-}" = "--live" ] && MODE="live"

if [ "$MODE" = "live" ]; then
  echo "⚠️  MODE LIVE : les paiements seront RÉELS (vrais clients, vraies cartes)."
  echo "   Prérequis : compte Stripe ACTIVÉ (identité + IBAN vérifiés) — voir PREMIUM-SETUP.md."
  read -r -p "   Tape LIVE en majuscules pour confirmer : " CONFIRM
  [ "$CONFIRM" = "LIVE" ] || { echo "⛔ Annulé."; exit 1; }
  echo "→ Mise à jour du code (git pull)..."
  git pull --ff-only origin main 2>/dev/null || echo "   (pull impossible, on continue avec la version locale)"
  read -r -s -p "Colle ta clé secrète Stripe LIVE (sk_live_...) puis Entrée : " SK
  echo ""
  case "$SK" in
    sk_live_*) ;;
    *) echo "⛔ Ce n'est pas une clé sk_live_ — abandon."; exit 1 ;;
  esac
else
  read -r -s -p "Colle ta clé secrète Stripe TEST (sk_test_...) puis Entrée : " SK
  echo ""
  case "$SK" in
    sk_test_*) ;;
    *) echo "⛔ Ce n'est pas une clé sk_test_ — abandon (lance avec --live pour le vrai argent)."; exit 1 ;;
  esac
fi

echo "→ Vérification de la clé auprès de Stripe..."
ACCT=$(curl -s -u "$SK:" https://api.stripe.com/v1/account | py 'import json,sys; d=json.load(sys.stdin); print(d.get("id") or d.get("error",{}).get("message","ERREUR"))')
case "$ACCT" in
  acct_*) echo "   OK (compte $ACCT)" ;;
  *) echo "⛔ Clé refusée par Stripe : $ACCT"; exit 1 ;;
esac

# --- Tarifs (idempotent via lookup_key) -------------------------------------
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

# --- Webhook (recréé à chaque run pour obtenir un secret frais) --------------
echo "→ Vérification d'un webhook existant sur ryo-offc.com/api/webhook..."
OLD_WH=$(curl -s -u "$SK:" -G https://api.stripe.com/v1/webhook_endpoints -d limit=100 \
  | py 'import json,sys; d=json.load(sys.stdin); print(next((w["id"] for w in d.get("data",[]) if w.get("url")=="https://ryo-offc.com/api/webhook"),""))')
if [ -n "$OLD_WH" ]; then
  echo "   Ancien webhook $OLD_WH trouvé → suppression (pour un secret de signature frais)"
  curl -s -u "$SK:" -X DELETE "https://api.stripe.com/v1/webhook_endpoints/$OLD_WH" > /dev/null
fi

echo "→ Création du webhook (4 événements)..."
WH=$(curl -s -u "$SK:" https://api.stripe.com/v1/webhook_endpoints \
  -d url="https://ryo-offc.com/api/webhook" \
  -d "enabled_events[]=checkout.session.completed" \
  -d "enabled_events[]=customer.subscription.deleted" \
  -d "enabled_events[]=charge.refunded" \
  -d "enabled_events[]=charge.dispute.created" \
  -d description="Quizz premium (entitlement D1)")
WHSEC=$(printf '%s' "$WH" | py 'import json,sys; d=json.load(sys.stdin); print(d.get("secret",""))')
case "$WHSEC" in
  whsec_*) echo "   OK (webhook créé, secret de signature récupéré)" ;;
  *) echo "⛔ Échec création webhook, réponse Stripe :"; printf '%s\n' "$WH"; exit 1 ;;
esac

# --- Secrets Worker ----------------------------------------------------------
echo "→ Pose des secrets sur le Worker Cloudflare (quizz-qui-est-le-meilleur)..."
printf '%s' "$SK"    | npx wrangler@4 secret put STRIPE_SECRET_KEY
printf '%s' "$WHSEC" | npx wrangler@4 secret put STRIPE_WEBHOOK_SECRET

echo "→ Génération + pose du SESSION_SECRET (aléatoire, jamais affiché)..."
openssl rand -hex 32 | npx wrangler@4 secret put SESSION_SECRET

if [ "$MODE" = "live" ]; then
  # --- Bascule AUTONOME du site (pensée pour être lancée SANS Claude) -------
  echo "→ Bascule du site en paiements réels..."
  perl -pi -e "s/\"PRICE_MONTHLY\": \"price_[A-Za-z0-9]+\"/\"PRICE_MONTHLY\": \"$P_MONTH\"/" wrangler.jsonc
  perl -pi -e "s/\"PRICE_LIFETIME\": \"price_[A-Za-z0-9]+\"/\"PRICE_LIFETIME\": \"$P_LIFE\"/" wrangler.jsonc
  perl -pi -e "s/export const PREMIUM_LIVE = false/export const PREMIUM_LIVE = true/" src/lib/premium.js
  grep -q "$P_MONTH" wrangler.jsonc || { echo "⛔ Échec mise à jour wrangler.jsonc"; exit 1; }
  grep -q 'PREMIUM_LIVE = true' src/lib/premium.js || { echo "⛔ Échec bascule PREMIUM_LIVE"; exit 1; }

  echo "→ Build du site..."
  npm run build > /dev/null 2>&1 || { echo "⛔ Le build a échoué — demande de l'aide à une IA (codex/agy)."; exit 1; }

  echo "→ Publication (le déploiement se fait tout seul via GitHub, ~1 min)..."
  git add wrangler.jsonc src/lib/premium.js
  git commit -m "GO LIVE : paiements réels activés (tarifs live + PREMIUM_LIVE=true)" > /dev/null
  git push origin main || { echo "⛔ Push refusé — réessaie : git push origin main"; exit 1; }

  echo ""
  echo "══════════════════════════════════════════════════════════════"
  echo "🎉 C'EST PARTI ! Dans ~1 minute, ryo-offc.com accepte les VRAIS paiements."
  echo "   La couronne 👑 et le bouton Soutenir 💜 réapparaissent ENSEMBLE."
  echo ""
  echo "   DERNIER TEST À FAIRE TOI-MÊME (~3 min, avec ta vraie carte) :"
  echo "   1. Recharge ryo-offc.com → couronne 👑 → achète « À vie » 9,99 €"
  echo "   2. La couronne doit disparaître (premium actif)"
  echo "   3. dashboard.stripe.com → Paiements → ton 9,99 € → Rembourser (total)"
  echo "   4. Recharge le site : la couronne doit REVENIR (premium bien coupé)"
  echo "   Si les 4 points passent : tout est validé, tu t'es remboursé, zéro frais perdu"
  echo "   (hors ~0,40 € de frais Stripe non restitués — le prix du test réel)."
  echo "══════════════════════════════════════════════════════════════"
else
  echo ""
  echo "══════════════════════════════════════════════════════════════"
  echo "✅ Terminé (mode test). Donne ces 2 identifiants PUBLICS à Claude :"
  echo "   MENSUEL : $P_MONTH"
  echo "   A VIE   : $P_LIFE"
  echo "══════════════════════════════════════════════════════════════"
fi
