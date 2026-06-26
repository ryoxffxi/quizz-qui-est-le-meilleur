// Scripts NON essentiels (mesure d'audience), chargés UNIQUEMENT après le
// consentement de l'utilisateur. Tant qu'aucun token n'est renseigné, rien
// n'est chargé : le bandeau reste donc 100 % honnête.
//
// Pour activer Cloudflare Web Analytics (gratuit, cookieless) plus tard :
// 1. dash.cloudflare.com → Web Analytics → ajouter le site ryo-offc.com
// 2. copier le "token" du beacon et le coller ci-dessous.
const CF_WEB_ANALYTICS_TOKEN = '98b4ad169e2b4f0f806ebf87bd173115'

let loaded = false

// Appelé seulement si l'utilisateur a cliqué sur « Accepter ».
// (La publicité AdSense est chargée via le <head> et son consentement est géré
// par le CMP certifié de Google ; ici on ne gère que la mesure d'audience.)
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
