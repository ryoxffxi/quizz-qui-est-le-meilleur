// Enregistrement du service worker (workbox-window via vite-plugin-pwa).
// Module SÉPARÉ, importé dynamiquement par pwa.js en production seulement :
// `virtual:pwa-register` n'existe que sous Vite, pas sous vitest, et son
// import statique ferait tomber les tests de tout ce qui importe pwa.js.
import { registerSW } from 'virtual:pwa-register'

// Renvoie la fonction updateSW(reload) de workbox-window.
export function register({ onNeedRefresh }) {
  return registerSW({
    immediate: true,
    onNeedRefresh,
    onRegisterError() {
      /* pas de SW (navigateur ancien, réseau) : l'app marche sans */
    },
  })
}
