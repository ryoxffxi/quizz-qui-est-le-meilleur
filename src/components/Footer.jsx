import { useI18n } from '../i18n'

// Pied de page centré : lien vers l'Instagram du créateur (@ryo.offc).
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
      <p className="footer-note">{t('footer_follow')}</p>
    </footer>
  )
}
