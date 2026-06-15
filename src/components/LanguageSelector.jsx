import { useEffect, useRef, useState } from 'react'
import { LANGUAGES, useI18n } from '../i18n'
import { sound } from '../lib/sound'

// Sélecteur de langue : drapeau courant + menu déroulant des 4 langues.
export default function LanguageSelector() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function choose(code) {
    sound.select()
    setLang(code)
    setOpen(false)
  }

  return (
    <div className="lang-select" ref={ref}>
      <button
        type="button"
        className="lang-toggle"
        onClick={() => {
          sound.select()
          setOpen((o) => !o)
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('lang_switch')}
        title={t('lang_switch')}
      >
        <span className="lang-flag">{current.flag}</span>
        <span className={`lang-caret ${open ? 'up' : ''}`}>▾</span>
      </button>

      {open && (
        <ul className="lang-menu" role="listbox">
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={l.code === lang}
                className={`lang-item ${l.code === lang ? 'active' : ''}`}
                onClick={() => choose(l.code)}
              >
                <span className="lang-flag">{l.flag}</span>
                <span className="lang-name">{l.label}</span>
                {l.code === lang && <span className="lang-check">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
