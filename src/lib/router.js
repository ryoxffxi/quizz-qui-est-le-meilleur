// Routeur PUR de l'App (aucune lecture de window) : traduit une adresse en
// route et une route en adresse, selon le contrat d'URL (worker/routes.js
// sert ces chemins avec index.html) :
//
//   /                          accueil (onglet Quiz, ou celui des préférences)
//   /revision/panneaux         accueil, onglet Panneaux (FR seulement)
//   /jouer/<cat>/<niveau>      révision solo
//   /erreurs/<cat>             rejouer mes erreurs
//   /defi/<cat>/<niveau>       réglages du défi (la partie reste sur ce chemin)
//   /examen                    examen blanc (FR seulement)
//   /quotidien[?cat=<cat>]     défi du jour (sans cat : préférence du joueur)
//   /flashcards                flashcards des panneaux (FR seulement)
//
// Hash sur / (liens partagés, prioritaires sur le chemin) :
//   #defi=<payload>            invitation à jouer les mêmes questions
//   #resultat=<payload>        page de résultat (conversion)
//
// Anciens liens encore acceptés puis normalisés par App :
//   /?jouer=<cat>&niveau=<niveau>   →  /jouer/<cat>/<niveau>
//   /?onglet=panneaux               →  /revision/panneaux
//
// Une adresse qui vise un écran impossible (catégorie inconnue, écran réservé
// au français hors FR, lien partagé illisible) renvoie l'accueil avec
// `notice: 'app_link_unavailable'` (clé i18n d'un message bref). Une adresse
// qui n'est pas une route de l'App renvoie null.
import { getCategory } from '../content'
import {
  decodeChallenge,
  decodeResult,
  encodeChallenge,
  encodeResult,
} from './challengeLink'
import { DIFFICULTIES } from './game'

export const HOME = Object.freeze({ screen: 'home' })

// Écrans « en partie » : interface réduite (pas de footer, contrôles limités).
const GAME_SCREENS = new Set(['solo', 'errors', 'challenge', 'exam', 'daily', 'flashcards'])

export function isGameScreen(screen) {
  return GAME_SCREENS.has(screen)
}

const NOTICE = 'app_link_unavailable'
const CAT = '[a-z0-9-]+'
const LEVEL = '(facile|expert)'
const RE_SOLO = new RegExp(`^/jouer/(${CAT})/${LEVEL}$`)
const RE_ERRORS = new RegExp(`^/erreurs/(${CAT})$`)
const RE_DUEL = new RegExp(`^/defi/(${CAT})/${LEVEL}$`)
const RE_HASH_RESULT = /[#&]resultat=([^&]+)/
const RE_HASH_INVITE = /[#&]defi=([^&]+)/

function isDifficulty(d) {
  return typeof d === 'string' && Object.hasOwn(DIFFICULTIES, d)
}

// La catégorie existe et n'est pas réservée au français quand la langue
// n'est pas le français.
export function isCategoryAvailable(categoryId, lang) {
  const category = getCategory(categoryId)
  if (!category) return false
  return lang === 'fr' || !category.frOnly
}

// Catégorie du défi du jour : adresse, puis préférence du joueur, puis défaut
// de la langue (code de la route en français, culture générale ailleurs).
export function resolveDailyCategory(route, prefs, lang) {
  const candidates = [
    route && route.categoryId,
    prefs && prefs.dailyCategory,
    lang === 'fr' ? 'code-route' : null,
    'culture-generale',
  ]
  return candidates.find((id) => id && isCategoryAvailable(id, lang)) || 'culture-generale'
}

function unavailable() {
  return { screen: 'home', notice: NOTICE }
}

// Chemin sans barre finale (sauf la racine), sans double barre.
function normalizePath(pathname) {
  const p = String(pathname || '/').replace(/\/+/g, '/')
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1)
  return p || '/'
}

// { pathname, search, hash } (window.location convient) → route | null.
export function parseLocation(location, { lang = 'fr' } = {}) {
  const pathname = normalizePath(location?.pathname)
  const hash = String(location?.hash || '')
  let params
  try {
    params = new URLSearchParams(String(location?.search || ''))
  } catch {
    params = new URLSearchParams()
  }

  // 1) Liens partagés dans le hash : prioritaires, toujours lus sur /.
  const resultMatch = hash.match(RE_HASH_RESULT)
  if (resultMatch) {
    const result = decodeResult(resultMatch[1])
    if (!result || !getCategory(result.c)) return unavailable()
    return { screen: 'result', result }
  }
  const inviteMatch = hash.match(RE_HASH_INVITE)
  if (inviteMatch) {
    const invite = decodeChallenge(inviteMatch[1])
    // Un défi de code de la route reçu par un joueur en anglais reste jouable :
    // seule l'existence de la catégorie compte pour un lien partagé.
    if (!invite || !getCategory(invite.c)) return unavailable()
    return { screen: 'invite', invite }
  }

  // 2) Racine : accueil, ou anciens liens ?jouer= / ?onglet=.
  if (pathname === '/') {
    const jouer = params.get('jouer')
    if (jouer) {
      if (!isCategoryAvailable(jouer, lang)) return unavailable()
      const difficulty = params.get('niveau') === 'expert' ? 'expert' : 'facile'
      return { screen: 'solo', categoryId: jouer, difficulty }
    }
    if (params.get('onglet') === 'panneaux') {
      return lang === 'fr' ? { screen: 'home', tab: 'panneaux' } : unavailable()
    }
    return { screen: 'home' }
  }

  if (pathname === '/revision/panneaux') {
    return lang === 'fr' ? { screen: 'home', tab: 'panneaux' } : unavailable()
  }

  // 3) Chemins du contrat.
  let m = pathname.match(RE_SOLO)
  if (m) {
    if (!isCategoryAvailable(m[1], lang)) return unavailable()
    return { screen: 'solo', categoryId: m[1], difficulty: m[2] }
  }
  m = pathname.match(RE_ERRORS)
  if (m) {
    if (!isCategoryAvailable(m[1], lang)) return unavailable()
    return { screen: 'errors', categoryId: m[1] }
  }
  m = pathname.match(RE_DUEL)
  if (m) {
    if (!isCategoryAvailable(m[1], lang)) return unavailable()
    return { screen: 'challengeSetup', categoryId: m[1], difficulty: m[2] }
  }
  if (pathname === '/examen') {
    return lang === 'fr' ? { screen: 'exam' } : unavailable()
  }
  if (pathname === '/quotidien') {
    // Catégorie illisible : on retombe sur la préférence du joueur (App).
    const cat = params.get('cat')
    const categoryId = cat && isCategoryAvailable(cat, lang) ? cat : null
    return { screen: 'daily', categoryId }
  }
  if (pathname === '/flashcards') {
    return lang === 'fr' ? { screen: 'flashcards' } : unavailable()
  }

  return null
}

// Route → chemin (avec hash pour les liens partagés, avec query pour le
// quotidien ciblé). Toujours absolu, jamais de barre finale.
export function pathFor(route) {
  if (!route || typeof route !== 'object') return '/'
  switch (route.screen) {
    case 'home':
      return route.tab === 'panneaux' ? '/revision/panneaux' : '/'
    case 'solo':
      return `/jouer/${route.categoryId}/${isDifficulty(route.difficulty) ? route.difficulty : 'facile'}`
    case 'errors':
      return `/erreurs/${route.categoryId}`
    case 'challengeSetup':
      return `/defi/${route.categoryId}/${isDifficulty(route.difficulty) ? route.difficulty : 'facile'}`
    case 'challenge': {
      const { categoryId, difficulty } = route.config || {}
      return `/defi/${categoryId}/${isDifficulty(difficulty) ? difficulty : 'facile'}`
    }
    case 'invite':
      return `/#defi=${encodeChallenge(route.invite)}`
    case 'result':
      return `/#resultat=${encodeResult(route.result)}`
    case 'exam':
      return '/examen'
    case 'daily':
      return route.categoryId ? `/quotidien?cat=${encodeURIComponent(route.categoryId)}` : '/quotidien'
    case 'flashcards':
      return '/flashcards'
    default:
      return '/'
  }
}

// Titre du document pour une route : « Code de la route · Facile · Quizz ».
// `t` = fonction de traduction (useI18n().t ou translate).
export function titleFor(route, t) {
  const app = t('app_name')
  const catLabel = (id) => {
    const category = getCategory(id)
    return category ? t(category.labelKey) : null
  }
  const diffLabel = (d) => (isDifficulty(d) ? t(`diff_${d}`) : null)
  const join = (...parts) => [...parts, app].filter(Boolean).join(' · ')

  if (!route || typeof route !== 'object') return t('app_title')
  switch (route.screen) {
    case 'home':
      return route.tab === 'panneaux' ? join(t('cat_panneaux')) : t('app_title')
    case 'solo':
      return join(catLabel(route.categoryId), diffLabel(route.difficulty))
    case 'errors':
      return join(t('errors_title'), catLabel(route.categoryId))
    case 'challengeSetup':
      return join(t('challenge_title'), catLabel(route.categoryId), diffLabel(route.difficulty))
    case 'challenge': {
      const { categoryId, difficulty } = route.config || {}
      return join(t('challenge_title'), catLabel(categoryId), diffLabel(difficulty))
    }
    case 'invite':
      return join(t('challenge_title'), catLabel(route.invite?.c))
    case 'result':
      return join(t('app_title_result'), catLabel(route.result?.c))
    case 'exam':
      return join(t('exam_title'))
    case 'daily':
      return join(t('daily_title'), route.categoryId ? catLabel(route.categoryId) : null)
    case 'flashcards':
      return join(t('flash_title'))
    default:
      return t('app_title')
  }
}
