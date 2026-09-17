import { useEffect, useId, useRef, useState } from 'react'
import { LANGUAGES, useI18n } from '../i18n'
import { sound } from '../lib/sound'
import { IconCheck, IconChevronDown } from './icons'

// Sélecteur de langue : drapeau courant + menu déroulant des 4 langues.
// Accessibilité : bouton aria-haspopup="listbox" / aria-expanded, liste
// role=listbox dont les entrées (li role=presentation > button role=option)
// se parcourent aux flèches, Début/Fin ; Échap ou Tab referment et rendent le
// focus au bouton ; un clic ou un toucher hors du menu le referme aussi.
export default function LanguageSelector() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const toggleRef = useRef(null)
  const itemRefs = useRef([])
  const listId = useId()
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]

  useEffect(() => {
    if (!open) return undefined
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc, { passive: true })
    // Focus initial sur la langue courante.
    const i = Math.max(
      0,
      LANGUAGES.findIndex((l) => l.code === lang),
    )
    if (itemRefs.current[i]) itemRefs.current[i].focus()
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
    }
  }, [open, lang])

  function closeMenu(refocus) {
    setOpen(false)
    if (refocus && toggleRef.current) toggleRef.current.focus()
  }

  function choose(code) {
    sound.select()
    setLang(code)
    closeMenu(true)
  }

  function onListKeyDown(e) {
    const n = LANGUAGES.length
    const i = itemRefs.current.indexOf(document.activeElement)
    let next = null
    if (e.key === 'ArrowDown') next = (i + 1) % n
    else if (e.key === 'ArrowUp') next = (i - 1 + n) % n
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = n - 1
    else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault()
      closeMenu(true)
      return
    }
    if (next === null) return
    e.preventDefault()
    if (itemRefs.current[next]) itemRefs.current[next].focus()
  }

  function onToggleKeyDown(e) {
    // Flèche bas sur le bouton fermé : ouvre le menu (focus posé par l'effet).
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      sound.select()
      setOpen(true)
    } else if (open && e.key === 'Escape') {
      e.preventDefault()
      closeMenu(true)
    }
  }

  return (
    <div className="lang-select" ref={ref}>
      <button
        ref={toggleRef}
        type="button"
        className="lang-toggle"
        onClick={() => {
          sound.select()
          setOpen((o) => !o)
        }}
        onKeyDown={onToggleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={t('lang_switch')}
        title={t('lang_switch')}
      >
        <span className="lang-flag" aria-hidden="true">
          {current.flag}
        </span>
        <span className={`lang-caret ${open ? 'up' : ''}`}>
          <IconChevronDown size={16} />
        </span>
      </button>

      {open && (
        <ul
          id={listId}
          className="lang-menu"
          role="listbox"
          aria-label={t('lang_switch')}
          onKeyDown={onListKeyDown}
        >
          {LANGUAGES.map((l, i) => {
            const selected = l.code === lang
            return (
              <li key={l.code} role="presentation">
                <button
                  type="button"
                  role="option"
                  lang={l.code}
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  ref={(el) => {
                    itemRefs.current[i] = el
                  }}
                  className={`lang-item ${selected ? 'active' : ''}`}
                  onClick={() => choose(l.code)}
                >
                  <span className="lang-flag" aria-hidden="true">
                    {l.flag}
                  </span>
                  <span className="lang-name">{l.label}</span>
                  {selected && (
                    <span className="lang-check">
                      <IconCheck size={18} />
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
