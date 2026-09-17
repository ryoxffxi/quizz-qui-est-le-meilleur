// PWA côté client : service worker (mise à jour sur demande), invitation
// d'installation (beforeinstallprompt) et rechargement propre quand un chunk
// d'une ancienne version ne se charge plus (vite:preloadError).
//
// Un petit store (useSyncExternalStore) expose l'état à React :
//   useInstallPrompt()  → fonction qui ouvre l'invitation native, ou null
//   useUpdateAvailable() → true quand une nouvelle version attend
//   applyUpdate()        → active la nouvelle version et recharge
//
// Ne fait rien en développement (pas de SW sous `vite`, pas d'événement).
import { useSyncExternalStore } from 'react'
import { track } from './analytics'
import { translate } from '../i18n'

const isDev = import.meta.env && import.meta.env.MODE === 'development'

let state = { install: null, update: false }
const listeners = new Set()
let installEvent = null // BeforeInstallPromptEvent retenu
let updateSW = null // fonction de workbox-window
let started = false
let reloading = false

function setState(patch) {
  state = { ...state, ...patch }
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getSnapshot() {
  return state
}

const SERVER_SNAPSHOT = { install: null, update: false }
function getServerSnapshot() {
  return SERVER_SNAPSHOT
}

// Ouvre l'invitation native d'installation. Renvoie 'accepted' | 'dismissed' | null.
async function promptInstall() {
  const event = installEvent
  if (!event) return null
  installEvent = null
  setState({ install: null }) // l'événement ne sert qu'une fois
  try {
    event.prompt()
    const choice = await event.userChoice
    const outcome = choice && choice.outcome === 'accepted' ? 'accepted' : 'dismissed'
    track('pwa_install', outcome)
    return outcome
  } catch {
    return null
  }
}

export function useInstallPrompt() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).install
}

export function useUpdateAvailable() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).update
}

// Active la version en attente (SKIP_WAITING) puis recharge ; sans SW, recharge.
export function applyUpdate() {
  if (updateSW) {
    updateSW(true).catch(() => window.location.reload())
  } else {
    window.location.reload()
  }
}

// Toast DOM minimal (hors React : un chunk manquant peut survenir pendant
// qu'un écran est en train de casser). Style : .app-toast dans styles/app.css.
function showDomToast(text) {
  try {
    const el = document.createElement('div')
    el.className = 'app-toast app-toast-static'
    el.setAttribute('role', 'status')
    el.textContent = text
    document.body.appendChild(el)
  } catch {
    /* sans DOM utilisable, on recharge quand même */
  }
}

// vite:preloadError : un import dynamique (écran, banque, modale) a échoué.
// En ligne, c'est presque toujours qu'une nouvelle version a remplacé les
// fichiers hachés : on prévient et on recharge. Hors ligne, on laisse l'écran
// afficher son message (BankGate / ScreenBoundary) : recharger n'aiderait pas.
export function onPreloadError() {
  if (reloading) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  reloading = true
  showDomToast(translate('app_update_reloading'))
  setTimeout(() => window.location.reload(), 1200)
}

// À appeler une fois au démarrage (main.jsx).
export function initPwa() {
  if (started || isDev || typeof window === 'undefined') return
  started = true

  // Invitation d'installation : on la retient, Home affiche « Installer l'app ».
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installEvent = e
    setState({ install: promptInstall })
  })
  window.addEventListener('appinstalled', () => {
    installEvent = null
    setState({ install: null })
  })

  // Service worker : seulement en build (le module virtuel n'existe que là).
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    import('./sw-register.js')
      .then(({ register }) => {
        updateSW = register({
          onNeedRefresh() {
            setState({ update: true })
          },
        })
      })
      .catch(() => {
        /* enregistrement impossible : l'app marche sans SW */
      })
  }
}

// Pour les tests : remet le store à zéro.
export function resetPwaForTests() {
  state = { install: null, update: false }
  installEvent = null
  updateSW = null
  started = false
  reloading = false
  listeners.clear()
}
