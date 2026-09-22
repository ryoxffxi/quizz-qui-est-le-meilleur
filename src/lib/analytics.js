// Deux choses distinctes vivent ici :
//
// 1. track(name, ctx) : mesure d'USAGE sans cookie ni identifiant. Un compteur
//    par (jour, événement, contexte) est incrémenté côté Worker (POST /api/ev,
//    table D1 `events`). Aucune donnée personnelle ne part (ni IP stockée, ni
//    user-agent, ni identifiant d'appareil) : track() ne dépend donc pas du
//    consentement. Rapport : `npm run events`.
//
// 2. loadNonEssential() : mesure d'AUDIENCE (Cloudflare Web Analytics), script
//    tiers chargé UNIQUEMENT après le clic « Accepter » du bandeau cookies.
//    (La publicité AdSense est chargée par le <head> d'index.html et son
//    consentement UE passe par le CMP certifié de Google, pas par ce bandeau.)

// Liste blanche des événements, identique à EVENT_NAMES de worker/index.js
// (parité vérifiée par un test). Hors liste : track() ne fait rien.
export const EVENT_NAMES = [
  'solo_start',
  'solo_lot_end',
  'solo_quit',
  'defi_create',
  'defi_open',
  'defi_end',
  'exam_start',
  'exam_end',
  'daily_end',
  'share',
  'errors_replay',
  'flash_session',
  'pwa_install',
  'error_boundary',
]
const EVENT_SET = new Set(EVENT_NAMES)

// Contexte court (id de catégorie, 'ok'/'ko'...) : ramené à [a-z0-9_-], 32 max.
function cleanCtx(ctx) {
  if (ctx === undefined || ctx === null) return ''
  return String(ctx)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32)
}

// Envoie un événement d'usage. Ne lève JAMAIS (le jeu ne doit pas dépendre de
// la mesure). sendBeacon survit à la fermeture de l'onglet ; repli fetch keepalive.
// Silencieux hors ligne (le navigateur abandonne l'envoi) et en dev (pas de Worker).
export function track(name, ctx) {
  try {
    if (!EVENT_SET.has(name)) return
    if (import.meta.env && import.meta.env.MODE === 'development') return
    const payload = { e: name }
    const c = cleanCtx(ctx)
    if (c) payload.c = c
    const body = JSON.stringify(payload)
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      // text/plain : type « simple », aucune pré-requête ; le Worker lit le texte brut.
      if (navigator.sendBeacon('/api/ev', new Blob([body], { type: 'text/plain' }))) return
    }
    if (typeof fetch === 'function') {
      fetch('/api/ev', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    /* jamais d'erreur remontée au jeu */
  }
}

// Cloudflare Web Analytics (gratuit, cookieless). Le token est public (il
// identifie le site, pas l'utilisateur) ; vide = rien n'est chargé.
const CF_WEB_ANALYTICS_TOKEN = '98b4ad169e2b4f0f806ebf87bd173115'

let loaded = false

// Appelé seulement si l'utilisateur a cliqué sur « Accepter » (CookieConsent).
export function loadNonEssential() {
  if (loaded) return
  loaded = true
  if (!CF_WEB_ANALYTICS_TOKEN) return
  const s = document.createElement('script')
  s.defer = true
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  s.setAttribute(
    'data-cf-beacon',
    JSON.stringify({ token: CF_WEB_ANALYTICS_TOKEN }),
  )
  document.head.appendChild(s)
}
