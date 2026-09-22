import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import { LanguageProvider } from './i18n'
import { initOverscroll } from './lib/overscroll'
import { bootstrapEntitlement } from './lib/premium'
import { initPwa, onPreloadError } from './lib/pwa'

// Un chunk d'une ancienne version ne se charge plus (nouveau déploiement) :
// petit message puis rechargement, au lieu d'un écran cassé (voir pwa.js).
window.addEventListener('vite:preloadError', onPreloadError)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
)

// Étirement élastique en fin de scroll (cohérent Safari/Chrome mobile).
initOverscroll()

// Vérifie l'entitlement premium côté serveur (et traite un retour de paiement).
bootstrapEntitlement()

// Service worker (mise à jour sur demande) et invitation d'installation.
initPwa()
