import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { loadNonEssential } from '../lib/analytics'

const KEY = 'quizz_cookie_consent'

// Bandeau de consentement discret, fidèle au thème sombre. Ne recouvre pas la
// page : on peut continuer à utiliser le quiz derrière. Par défaut, seuls les
// cookies essentiels sont actifs ; la mesure d'audience ne se charge qu'après
// un clic sur « Accepter ». Le choix est mémorisé dans localStorage.
// Cibles tactiles : .cookie-btn et .cookie-more font 44 px de haut (index.css).
function readChoice() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null // localStorage indisponible
  }
}

export default function CookieConsent() {
  const { t } = useI18n()
  // Visible tant qu'aucun choix n'est mémorisé (lecture pure à l'initialisation,
  // pas de setState dans l'effet : StrictMode rejoue l'initialiseur sans effet).
  const [visible, setVisible] = useState(() => {
    const choice = readChoice()
    return choice !== 'accepted' && choice !== 'rejected'
  })
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (readChoice() === 'accepted') loadNonEssential() // idempotent

    // Rouvrir le bandeau depuis le lien « Cookies » du pied de page.
    const open = () => {
      setExpanded(false)
      setVisible(true)
    }
    window.addEventListener('quizz:open-cookies', open)
    return () => window.removeEventListener('quizz:open-cookies', open)
  }, [])

  function decide(choice) {
    try {
      localStorage.setItem(KEY, choice)
    } catch {
      /* ignore */
    }
    if (choice === 'accepted') loadNonEssential()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="cookie-banner"
      role="dialog"
      aria-live="polite"
      aria-label={t('cookie_text')}
    >
      <p className="cookie-text">{t('cookie_text')}</p>
      {expanded && <p className="cookie-detail">{t('cookie_detail')}</p>}
      <div className="cookie-actions">
        <button
          type="button"
          className="cookie-btn cookie-reject"
          onClick={() => decide('rejected')}
        >
          {t('cookie_reject')}
        </button>
        <button
          type="button"
          className="cookie-btn cookie-accept"
          onClick={() => decide('accepted')}
        >
          {t('cookie_accept')}
        </button>
      </div>
      <button
        type="button"
        className="cookie-more"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        {t('cookie_more')}
      </button>
    </div>
  )
}
