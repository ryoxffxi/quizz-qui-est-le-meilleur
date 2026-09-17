// Google AdSense : identifiants PUBLICS du site (ils désignent l'éditeur et le
// bloc d'annonce, rien de secret). Tant qu'ils sont vides, aucun <ins> n'est
// rendu et aucun push n'est fait (voir ResultAd.jsx).
//
// Le script adsbygoogle.js est chargé UNE fois par le <head> d'index.html ; le
// consentement publicitaire UE est recueilli par le CMP certifié de Google
// (« Privacy & messaging » du tableau de bord AdSense), pas par notre bandeau
// cookies, qui ne gère que la mesure d'audience (src/lib/analytics.js).
export const ADSENSE_CLIENT = 'ca-pub-1164405138212191'
// Bloc "Quizz - Ecran de resultat" (Display responsive), créé le 2026-08-17.
export const ADSENSE_SLOT_RESULT = '1966671408'

export function adsConfigured() {
  return Boolean(ADSENSE_CLIENT && ADSENSE_SLOT_RESULT)
}
