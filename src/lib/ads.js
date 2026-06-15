// Configuration Google AdSense.
// Tant que ces constantes sont vides, AUCUNE pub n'est chargée ni affichée :
// on montre à la place un petit encart "Premium = sans pub".
//
// Pour activer après validation du compte AdSense :
// 1. ADSENSE_CLIENT = ton ID éditeur, ex. 'ca-pub-1234567890123456'
// 2. ADSENSE_SLOT_RESULT = l'ID du bloc d'annonce créé pour l'écran de résultat
export const ADSENSE_CLIENT = 'ca-pub-1164405138212191'
export const ADSENSE_SLOT_RESULT = '' // ⬅️ à compléter avec l'ID du bloc "Display"

// Nombre de pubs montrées après un quiz (choix produit : 1 pour préserver l'UX).
export const INTERSTITIAL_COUNT = 1

export function adsConfigured() {
  return Boolean(ADSENSE_CLIENT && ADSENSE_SLOT_RESULT)
}

let scriptLoaded = false

// Charge le script AdSense — appelé uniquement APRÈS consentement (cookies pub).
export function loadAdsense() {
  if (scriptLoaded || !ADSENSE_CLIENT) return
  scriptLoaded = true
  const s = document.createElement('script')
  s.async = true
  s.src =
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
    ADSENSE_CLIENT
  s.crossOrigin = 'anonymous'
  document.head.appendChild(s)
}
