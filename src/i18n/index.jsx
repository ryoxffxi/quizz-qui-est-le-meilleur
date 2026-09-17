/* eslint-disable react-refresh/only-export-components -- ce module est le point
   d'entrée i18n : il expose le fournisseur ET ses helpers (t, tn, formats). Un
   rechargement complet à chaud quand il change est voulu. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
  { code: 'pt', flag: '🇧🇷', label: 'Português (Brasil)' },
]

// Locales Intl par langue (nombres, monnaie, dates, pluriels). Le PT est du
// portugais du Brésil. À importer ici plutôt que de redéfinir localement.
export const LOCALES = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', pt: 'pt-BR' }

const SUPPORTED = LANGUAGES.map((l) => l.code)

// Langue initiale : 1) choix mémorisé, 2) langue d'un lien ouvert (défi ou
// résultat partagé), 3) navigateur, 4) français. Le deck d'un défi ne dépend
// pas de la langue : un lien peut donc s'ouvrir dans la langue du joueur.
export function detectInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (SUPPORTED.includes(saved)) return saved
  } catch {
    /* localStorage indisponible */
  }
  const link = readResultFromUrl() || readChallengeFromUrl()
  if (link && SUPPORTED.includes(link.l)) return link.l
  if (typeof navigator !== 'undefined' && navigator.language) {
    const prefix = navigator.language.toLowerCase().slice(0, 2)
    if (SUPPORTED.includes(prefix)) return prefix
  }
  return 'fr' // français par défaut
}

// Langue courante vue par le code hors React (libs, partage). Synchronisée par
// le fournisseur à chaque changement ; les helpers l'utilisent par défaut.
let currentLang = typeof window !== 'undefined' ? detectInitialLang() : 'fr'

export function getLang() {
  return currentLang
}

function localeOf(lang) {
  return LOCALES[lang] || LOCALES.fr
}

// Traduction brute : dictionnaire de la langue, repli FR, puis la clé elle-même.
export function translate(key, vars, lang = currentLang) {
  const dict = DICTS[lang] || DICTS.fr
  let str = dict[key] ?? DICTS.fr[key] ?? key
  if (vars) {
    str = str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m))
  }
  return str
}

// Catégorie de pluriel Intl ('one', 'other', 'many'…) pour n dans la langue.
export function pluralCategory(n, lang = currentLang) {
  try {
    return new Intl.PluralRules(localeOf(lang)).select(Number(n) || 0)
  } catch {
    return Math.abs(Number(n)) === 1 ? 'one' : 'other'
  }
}

// Nombre formaté dans la langue (« 2 140 » en français, « 2,140 » en anglais).
export function fmtNumber(n, lang = currentLang) {
  const value = Number(n)
  if (!Number.isFinite(value)) return String(n)
  try {
    return new Intl.NumberFormat(localeOf(lang)).format(value)
  } catch {
    return String(value)
  }
}

// Montant en euros : « 2 € », « €2 », « € 9,99 » selon la langue. Sans
// décimales quand le montant est entier.
export function fmtCurrency(n, lang = currentLang) {
  const value = Number(n)
  if (!Number.isFinite(value)) return String(n)
  const entier = Number.isInteger(value)
  try {
    return new Intl.NumberFormat(localeOf(lang), {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: entier ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${entier ? value : value.toFixed(2)} €`
  }
}

// Date ISO (« 2026-09-07 », ou date-heure complète) -> date dans la langue.
// style = 'long' (7 septembre 2026), 'medium', 'short' ou 'full'.
// Une date seule est prise à midi local : aucun fuseau ne fait reculer le jour.
export function fmtDate(iso, style = 'long', lang = currentLang) {
  if (!iso) return ''
  const s = String(iso)
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00:00` : s)
  if (Number.isNaN(date.getTime())) return s
  try {
    return new Intl.DateTimeFormat(localeOf(lang), { dateStyle: style }).format(date)
  } catch {
    return s
  }
}

// Durée en secondes -> « m:ss » (chrono, compte à rebours) ; « h:mm:ss » au-delà
// d'une heure. Valeurs négatives ou invalides -> « 0:00 ».
export function fmtTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`
  return `${m}:${ss}`
}

// Pluriel : cherche `clé_<catégorie>` (Intl.PluralRules : one, other…), puis
// `clé_other`, puis `clé`. {n} est injecté formaté ; vars peut compléter.
export function tn(key, n, vars, lang = currentLang) {
  const dict = DICTS[lang] || DICTS.fr
  const candidates = [`${key}_${pluralCategory(n, lang)}`, `${key}_other`, key]
  const found = candidates.find((c) => c in dict || c in DICTS.fr) || key
  return translate(found, { n: fmtNumber(n, lang), ...vars }, lang)
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

  // Le code hors React lit la même langue que l'interface.
  useEffect(() => {
    currentLang = lang
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      locale: localeOf(lang),
      setLang,
      t: (key, vars) => translate(key, vars, lang),
      tn: (key, n, vars) => tn(key, n, vars, lang),
      fmtNumber: (n) => fmtNumber(n, lang),
      fmtCurrency: (n) => fmtCurrency(n, lang),
      fmtDate: (iso, style = 'long') => fmtDate(iso, style, lang),
      fmtTime,
    }),
    [lang, setLang],
  )

  // Synchronise le DOM avec la langue de l'UI (a11y lecteurs d'écran + SEO/crawlers).
  useEffect(() => {
    document.documentElement.lang = lang
    const titre = translate('app_title', null, lang)
    if (titre && titre !== 'app_title') document.title = titre
  }, [lang])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useI18n() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useI18n doit être utilisé dans <LanguageProvider>')
  return ctx
}
