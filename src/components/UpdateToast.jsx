import { useI18n } from '../i18n'
import { applyUpdate, useUpdateAvailable } from '../lib/pwa'
import { sound } from '../lib/sound'
import '../styles/app.css'

// Bandeau bref en bas de l'écran (message d'état, mise à jour disponible).
// `tone` : 'info' (défaut) ou 'warn'.
export function Toast({ children, tone = 'info', className = '' }) {
  return (
    <div
      className={`app-toast app-toast-${tone} ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      {children}
    </div>
  )
}

// « Nouvelle version disponible » + bouton Recharger : affiché quand le
// service worker a une version en attente (registerType 'prompt').
export default function UpdateToast() {
  const { t } = useI18n()
  const update = useUpdateAvailable()
  if (!update) return null
  return (
    <Toast className="app-toast-update">
      <span className="app-toast-text">{t('app_update_title')}</span>
      <button
        type="button"
        className="btn btn-primary app-toast-btn"
        onClick={() => {
          sound.select()
          applyUpdate()
        }}
      >
        {t('app_update_reload')}
      </button>
    </Toast>
  )
}
