import { useI18n } from '../i18n'
import { PREMIUM_LIVE } from '../lib/premium'
import { IconHeart } from './icons'

// « Cookies » : rouvre le bandeau maison (événement écouté par CookieConsent)
// ET le message de consentement Google (CMP AdSense) quand il est chargé ;
// sans erreur si googlefc est absent (consentement refusé, bloqueur, dev).
function reopenCookies() {
  window.dispatchEvent(new CustomEvent('quizz:open-cookies'))
  try {
    const fc = window.googlefc
    fc?.callbackQueue?.push({ CONSENT_DATA_READY: () => fc.showRevocationMessage() })
  } catch {
    /* CMP indisponible : le bandeau maison suffit */
  }
}

// Pied de page centré : lien vers l'Instagram du créateur (@ryo.offc), bouton
// de soutien (quand les paiements sont ouverts) et liens légaux. Toutes les
// cibles font 44 px de haut (voir .insta-link, .footer-donate, .footer-links).
export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="site-footer">
      <a
        className="insta-link"
        href="https://www.instagram.com/ryo.offc/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram @ryo.offc"
      >
        <svg
          className="insta-icon"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#feda75" />
              <stop offset="0.35" stopColor="#fa7e1e" />
              <stop offset="0.62" stopColor="#d62976" />
              <stop offset="1" stopColor="#962fbf" />
            </linearGradient>
          </defs>
          <rect
            x="2"
            y="2"
            width="20"
            height="20"
            rx="5.5"
            fill="none"
            stroke="url(#ig-grad)"
            strokeWidth="2"
          />
          <circle
            cx="12"
            cy="12"
            r="4.2"
            fill="none"
            stroke="url(#ig-grad)"
            strokeWidth="2"
          />
          <circle cx="17.4" cy="6.6" r="1.35" fill="url(#ig-grad)" />
        </svg>
        <span>@ryo.offc</span>
      </a>
      {PREMIUM_LIVE && (
        <button
          type="button"
          className="footer-donate"
          onClick={() => window.dispatchEvent(new CustomEvent('quizz:open-donate'))}
        >
          <IconHeart size={16} />
          <span>{t('donate_footer')}</span>
        </button>
      )}
      <nav className="footer-links">
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('quizz:open-legal', { detail: 'privacy' }),
            )
          }
        >
          {t('footer_privacy')}
        </button>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('quizz:open-legal', { detail: 'terms' }),
            )
          }
        >
          {t('footer_terms')}
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" onClick={reopenCookies}>
          {t('cookie_manage')}
        </button>
        <span aria-hidden="true">·</span>
        {/* Pages statiques (voir scripts/build-pages.mjs), en français. */}
        <a href="/a-propos">{t('footer_about')}</a>
        <span aria-hidden="true">·</span>
        <a href="/contact">{t('footer_contact')}</a>
      </nav>
    </footer>
  )
}
