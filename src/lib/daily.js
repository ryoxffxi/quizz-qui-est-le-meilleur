// Défi du jour : mêmes questions pour tout le monde, par catégorie et par jour
// (jour civil de Paris). Le tirage est déterministe (seededDeck) ; le résultat
// du jour est mémorisé en localStorage (clé quizz_daily), remis à zéro dès que
// la date change.
import { DAILY_QUESTIONS } from './game'
import { seededDeck } from './quiz'

const KEY = 'quizz_daily'
const TIME_ZONE = 'Europe/Paris'
const DAY_MS = 86400000
const HOUR_MS = 3600000

// Composantes de la date/heure de Paris pour un instant donné.
function parisParts(now) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now)
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '00'
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    second: Number(get('second')),
  }
}

// Clé du jour 'YYYY-MM-DD' en heure de Paris (repli : date locale).
export function todayKey(now = new Date()) {
  try {
    const p = parisParts(now)
    return `${p.year}-${p.month}-${p.day}`
  } catch {
    const pad = (n) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  }
}

// Graine du tirage : un paquet différent par jour et par catégorie.
export function dailySeed(dateKey, cat) {
  return `daily:${dateKey}:${cat}`
}

// Les DAILY_QUESTIONS questions du jour (pool = facile + expert de la catégorie).
export function buildDailyDeck(pool, dateKey, cat) {
  return seededDeck(pool, dailySeed(dateKey, cat), DAILY_QUESTIONS)
}

function readState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (s && typeof s === 'object' && typeof s.date === 'string') {
        return { date: s.date, results: s.results && typeof s.results === 'object' ? s.results : {} }
      }
    }
  } catch {
    /* localStorage indisponible ou contenu illisible */
  }
  return null
}

// État du jour : { date, results: { [cat]: { score, grid, ts } } }.
// Une date différente de celle stockée renvoie un état vierge.
export function getDailyState(now = new Date()) {
  const today = todayKey(now)
  const stored = readState()
  if (stored && stored.date === today) return stored
  return { date: today, results: {} }
}

export function hasPlayedToday(cat, now = new Date()) {
  return Boolean(getDailyState(now).results[cat])
}

export function saveDailyResult(cat, { score, grid }, now = new Date()) {
  const state = getDailyState(now)
  state.results[cat] = { score, grid, ts: now.getTime() }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
  return state
}

// Millisecondes restantes avant le prochain minuit de Paris. L'heure murale
// donne l'estimation ; les deux jours de changement d'heure (journée de 23 h
// ou 25 h) sont corrigés en vérifiant que la clé du jour bascule bien.
export function nextMidnightMs(now = new Date()) {
  const today = todayKey(now)
  const p = parisParts(now)
  const elapsed =
    p.hour * HOUR_MS + p.minute * 60000 + p.second * 1000 + now.getMilliseconds()
  let left = DAY_MS - elapsed
  const at = (ms) => todayKey(new Date(now.getTime() + ms))
  if (at(left) === today) left += HOUR_MS
  else if (left > HOUR_MS && at(left - HOUR_MS) !== today) left -= HOUR_MS
  return Math.max(0, left)
}
