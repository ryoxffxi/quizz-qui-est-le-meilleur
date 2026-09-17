// Préférences d'accueil du joueur (une seule clé localStorage : quizz_prefs).
// Source unique pour App et Home : Home reçoit `prefs` en prop et remonte ses
// changements par onPrefsChange(patch) ; App écrit ici et repasse la valeur.
//
//   { tab: 'quiz'|'panneaux', mode: 'solo'|'challenge',
//     difficulty: 'facile'|'expert', lastCategory: string|null,
//     dailyCategory: string|null }
//
// Toute valeur illisible ou inconnue (ancienne version, catégorie supprimée,
// stockage corrompu) retombe sur sa valeur par défaut : getPrefs ne lève jamais.
import { getCategory } from '../content'

export const PREFS_KEY = 'quizz_prefs'
const VERSION = 1

export const DEFAULT_PREFS = Object.freeze({
  tab: 'quiz',
  mode: 'solo',
  difficulty: 'facile',
  lastCategory: null,
  dailyCategory: null,
})

const TABS = ['quiz', 'panneaux']
const MODES = ['solo', 'challenge']
const LEVELS = ['facile', 'expert']

function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

// Une catégorie n'est gardée que si elle existe encore dans le contenu.
function pickCategory(value) {
  return typeof value === 'string' && getCategory(value) ? value : null
}

// Ramène n'importe quel objet à la forme attendue (migration implicite).
export function sanitizePrefs(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  return {
    tab: pick(src.tab, TABS, DEFAULT_PREFS.tab),
    mode: pick(src.mode, MODES, DEFAULT_PREFS.mode),
    difficulty: pick(src.difficulty, LEVELS, DEFAULT_PREFS.difficulty),
    lastCategory: pickCategory(src.lastCategory),
    dailyCategory: pickCategory(src.dailyCategory),
  }
}

function read() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function getPrefs() {
  return sanitizePrefs(read())
}

// Fusionne un patch, persiste, renvoie les préférences complètes. Les champs
// inconnus du patch sont ignorés.
export function setPrefs(patch) {
  const next = sanitizePrefs({ ...getPrefs(), ...(patch || {}) })
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ v: VERSION, ...next }))
  } catch {
    /* navigation privée ou quota : la préférence ne survivra pas, sans gravité */
  }
  return next
}

export function resetPrefs() {
  try {
    localStorage.removeItem(PREFS_KEY)
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PREFS }
}
