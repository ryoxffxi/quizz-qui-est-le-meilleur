// Progression du joueur (toutes sessions), en localStorage, sans compte.
// Format v2 : totaux, progression par catégorie+difficulté, jours joués,
// série de jours consécutifs et historique des 20 dernières manches.
// Migration transparente depuis l'ancien format { answered, correct }.
import { loadSeen } from './revision'
import { countQuestions } from '../content'
import { EXAM_READY_SCORE } from './game'

const KEY = 'quizz_stats'
const VERSION = 2
const MAX_DAYS = 400 // jours conservés (≈ 13 mois)
const MAX_HISTORY = 20 // manches conservées
const DAY_MS = 86400000

// Clé de progression : '<cat>:<diff>'. Sans difficulté (examen blanc, mode
// erreurs), on range sous le mode pour ne pas polluer le record d'un niveau.
export function statsKey(cat, diff, mode) {
  return `${cat}:${diff || mode || 'all'}`
}

// Date locale 'YYYY-MM-DD' (le jour du joueur, pas UTC).
export function dayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Nombre de jours entre deux clés 'YYYY-MM-DD' (b - a), insensible à l'heure d'été.
function dayDiff(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number)
  const [y2, m2, d2] = b.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / DAY_MS)
}

const num = (v) => (Number.isFinite(v) ? v : 0)

function empty() {
  return {
    v: VERSION,
    total: { answered: 0, correct: 0 },
    byKey: {},
    days: [],
    streak: { current: 0, best: 0, last: null },
    history: [],
  }
}

// Ramène n'importe quelle donnée lue (v2 partielle, ancien format, bruit) à
// une structure v2 complète. Jamais d'exception.
function normalize(raw) {
  const s = empty()
  if (!raw || typeof raw !== 'object') return s
  if (raw.v !== VERSION) {
    // Ancien format : { answered, correct } uniquement.
    s.total.answered = num(raw.answered)
    s.total.correct = num(raw.correct)
    return s
  }
  s.total.answered = num(raw.total?.answered)
  s.total.correct = num(raw.total?.correct)
  if (raw.byKey && typeof raw.byKey === 'object') {
    for (const [k, v] of Object.entries(raw.byKey)) {
      if (!v || typeof v !== 'object') continue
      s.byKey[k] = {
        answered: num(v.answered),
        correct: num(v.correct),
        best: num(v.best),
        bestTotal: num(v.bestTotal),
        rounds: num(v.rounds),
        lastPlayed: typeof v.lastPlayed === 'string' ? v.lastPlayed : null,
      }
    }
  }
  if (Array.isArray(raw.days)) {
    s.days = raw.days.filter((d) => typeof d === 'string').slice(-MAX_DAYS)
  }
  s.streak.current = num(raw.streak?.current)
  s.streak.best = num(raw.streak?.best)
  s.streak.last = typeof raw.streak?.last === 'string' ? raw.streak.last : null
  if (Array.isArray(raw.history)) {
    s.history = raw.history
      .filter((h) => h && typeof h === 'object')
      .map((h) => ({
        date: typeof h.date === 'string' ? h.date : '',
        cat: typeof h.cat === 'string' ? h.cat : '',
        diff: typeof h.diff === 'string' ? h.diff : undefined,
        mode: typeof h.mode === 'string' ? h.mode : 'solo',
        score: num(h.score),
        total: num(h.total),
      }))
      .slice(-MAX_HISTORY)
  }
  return s
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    /* localStorage indisponible ou contenu illisible */
  }
  return empty()
}

function save(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* navigation privée ou quota : la progression ne survivra pas, sans gravité */
  }
}

function bucket(s, key) {
  if (!s.byKey[key]) {
    s.byKey[key] = { answered: 0, correct: 0, best: 0, bestTotal: 0, rounds: 0, lastPlayed: null }
  }
  return s.byKey[key]
}

// Structure v2 complète (copie fraîche, modifiable sans risque).
export function getStats() {
  return load()
}

// À appeler à CHAQUE réponse validée, quel que soit le mode. Met à jour les
// totaux, la progression de la clé, les jours joués et la série.
export function recordAnswer(cat, diff, isCorrect) {
  const s = load()
  const ok = isCorrect ? 1 : 0
  s.total.answered += 1
  s.total.correct += ok
  const b = bucket(s, statsKey(cat, diff))
  b.answered += 1
  b.correct += ok
  b.lastPlayed = new Date().toISOString()

  const today = dayKey()
  if (s.streak.last !== today) {
    const gap = s.streak.last ? dayDiff(s.streak.last, today) : Infinity
    if (gap === 1) s.streak.current += 1
    else if (gap > 1) s.streak.current = 1
    // gap <= 0 : horloge revenue en arrière, on ne casse rien.
    if (gap >= 1) s.streak.last = today
    s.streak.best = Math.max(s.streak.best, s.streak.current)
  }
  if (!s.days.includes(today)) {
    s.days.push(today)
    if (s.days.length > MAX_DAYS) s.days = s.days.slice(-MAX_DAYS)
  }
  save(s)
}

// Fin de lot, de manche ou d'examen : record de la clé + historique.
// mode : 'solo' | 'defi' | 'examen' | 'quotidien' | 'erreurs'.
export function recordRound({ cat, diff, mode = 'solo', score, total }) {
  const s = load()
  const sc = num(score)
  const tot = num(total)
  const b = bucket(s, statsKey(cat, diff, mode))
  b.rounds += 1
  b.lastPlayed = new Date().toISOString()
  if (sc > b.best || (sc === b.best && tot > b.bestTotal)) {
    b.best = sc
    b.bestTotal = tot
  }
  s.history.push({ date: new Date().toISOString(), cat, diff, mode, score: sc, total: tot })
  if (s.history.length > MAX_HISTORY) s.history = s.history.slice(-MAX_HISTORY)
  save(s)
}

// Série de jours consécutifs. Tolérance du jour courant : une série dont le
// dernier jour est hier reste vivante (playedToday=false) ; au-delà, 0.
export function getStreak() {
  const s = load()
  if (!s.streak.last) return { current: 0, best: s.streak.best, playedToday: false }
  const gap = dayDiff(s.streak.last, dayKey())
  return {
    current: gap <= 1 ? s.streak.current : 0,
    best: s.streak.best,
    playedToday: gap === 0,
  }
}

// Progression d'une catégorie/difficulté pour l'accueil.
// seen = questions déjà vues du cycle de révision en cours, total = banque.
export function getProgress(cat, diff) {
  const s = load()
  const b = s.byKey[statsKey(cat, diff)] || { answered: 0, correct: 0, best: 0, bestTotal: 0 }
  return {
    seen: loadSeen(cat, diff).size,
    total: countQuestions(cat, diff),
    answered: b.answered,
    correct: b.correct,
    accuracy: b.answered > 0 ? Math.round((b.correct / b.answered) * 100) : null,
    best: b.best,
    bestTotal: b.bestTotal,
  }
}

// Prêt pour l'examen ? exams = examens blancs dans l'historique, avg = moyenne
// des 3 derniers (null sans examen), ready = avg ≥ EXAM_READY_SCORE.
export function getExamReadiness() {
  const s = load()
  const exams = s.history.filter((h) => h.mode === 'examen')
  const last = exams.slice(-3)
  const avg = last.length
    ? Math.round((last.reduce((n, h) => n + h.score, 0) / last.length) * 10) / 10
    : null
  return { exams: exams.length, avg, ready: avg != null && avg >= EXAM_READY_SCORE }
}
