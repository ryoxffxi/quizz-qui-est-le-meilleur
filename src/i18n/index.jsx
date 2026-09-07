import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import fr from './fr'
import en from './en'
import es from './es'
import pt from './pt'
import { readChallengeFromUrl, readResultFromUrl } from '../lib/challengeLink'

// Dictionnaires par fonctionnalité (src/i18n/parts/*.js), fusionnés ici :
// chaque fichier exporte { fr, en, es, pt } et ne touche pas aux dictionnaires
// principaux, ce qui évite les conflits quand plusieurs chantiers avancent.
const PARTS = import.meta.glob('./parts/*.js', { eager: true })
const DICTS = { fr: { ...fr }, en: { ...en }, es: { ...es }, pt: { ...pt } }
for (const mod of Object.values(PARTS)) {
  const part = mod.default || {}
  for (const code of Object.keys(DICTS)) Object.assign(DICTS[code], part[code] || {})
}
const STORAGE_KEY = 'quizzo_lang'

// Langues disponibles (drapeau + libellé), pour le sélecteur.
export const LANGUAGES = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'pt', flag: '🇵🇹', label: 'Português' },
]

const SUPPORTED = LANGUAGES.map((l) => l.code)

// Langue initiale : 1) celle d'un lien ouvert, 2) localStorage, 3) navigateur.
export function detectInitialLang() {
  const link = readResultFromUrl() || readChallengeFromUrl()
  if (link && SUPPORTED.includes(link.l)) return link.l
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (SUPPORTED.includes(saved)) return saved
  } catch {
    /* localStorage indisponible */
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    const prefix = navigator.language.toLowerCase().slice(0, 2)
    if (SUPPORTED.includes(prefix)) return prefix
  }
  return 'fr' // français par défaut
}

const LangContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLang)

  const setLang = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback(
    (key, vars) => {
      const dict = DICTS[lang] || DICTS.fr
      let str = dict[key] ?? DICTS.fr[key] ?? key
      if (vars) {
        str = str.replace(/\{(\w+)\}/g, (m, k) =>
          vars[k] != null ? String(vars[k]) : m,
        )
      }
      return str
    },
    [lang],
  )

  // Synchronise le DOM avec la langue de l'UI (a11y lecteurs d'écran + SEO/crawlers).
  useEffect(() => {
    document.documentElement.lang = lang
    const titre = t('app_title')
    if (titre && titre !== 'app_title') document.title = titre
  }, [lang, t])

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useI18n doit être utilisé dans <LanguageProvider>')
  return ctx
}
