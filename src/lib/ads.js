// Configuration Google AdSense.
// Le script AdSense est chargé depuis index.html (vérification du site) et le
// consentement UE est géré par le CMP certifié « Privacy & messaging » de
// Google, à activer dans le tableau de bord AdSense.
//
// Tant qu'aucun slot n'est renseigné, AUCUNE pub n'est affichée : on montre à
// la place un petit encart "Premium = sans pub".
//
// Pour activer après validation du compte AdSense :
// 1. AdSense → Annonces → Par bloc d'annonces → créer un bloc « Display »
// 2. copier son ID (data-ad-slot) :
//    - soit dans la variable d'environnement VITE_ADSENSE_SLOT_RESULT
//      (Cloudflare Pages → Settings → Variables) puis redéployer,
//    - soit en repli ci-dessous, en dur à la place de ''.
export const ADSENSE_CLIENT = 'ca-pub-1164405138212191'
export const ADSENSE_SLOT_RESULT =
  import.meta.env.VITE_ADSENSE_SLOT_RESULT || ''

export function adsConfigured() {
  return Boolean(ADSENSE_CLIENT && ADSENSE_SLOT_RESULT)
}
