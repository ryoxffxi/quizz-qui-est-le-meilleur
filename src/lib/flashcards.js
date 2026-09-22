// Flashcards des panneaux : système de Leitner à 3 boîtes, sans compte.
//
//   boîte 1 : revue tous les jours     (nouvelle carte, ou carte ratée)
//   boîte 2 : revue tous les 3 jours   (sue une fois)
//   boîte 3 : revue tous les 7 jours   (acquise)
//
// Une carte sue monte d'une boîte, une carte ratée retombe en boîte 1.
// L'échéance est un minuit LOCAL : une carte ratée à 23 h est due dès le
// lendemain matin, pas 24 h plus tard. Persistance : clé quizz_flash,
// { [idPanneau]: { box, due, last } }. Les fonctions « *From » sont pures
// (état en entrée) ; les autres lisent et écrivent le localStorage.
import { SIGNS } from '../content/panneaux/signs'

export const FLASH_KEY = 'quizz_flash'
export const FLASH_BOXES = 3
export const FLASH_INTERVAL_DAYS = { 1: 1, 2: 3, 3: 7 }
export const FLASH_SESSION_SIZE = 20

const ALL_IDS = SIGNS.map((s) => s.id)

export function loadFlash() {
  try {
    const raw = localStorage.getItem(FLASH_KEY)
    if (raw) {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj
    }
  } catch {
    /* localStorage indisponible ou illisible : on repart de zéro */
  }
  return {}
}

export function saveFlash(state) {
  try {
    localStorage.setItem(FLASH_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

// Minuit local, `days` jours après `now`.
export function dueAfter(now, days) {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

// Cartes à revoir : celles dont l'échéance est passée (les plus anciennes
// d'abord), puis les cartes jamais vues (dans l'ordre de la banque).
export function dueFrom(state, now = Date.now(), ids = ALL_IDS) {
  const due = []
  const fresh = []
  for (const id of ids) {
    const entry = state[id]
    if (!entry) fresh.push(id)
    else if (entry.due <= now) due.push(id)
  }
  due.sort((a, b) => state[a].due - state[b].due) // tri stable : ordre banque à égalité
  return [...due, ...fresh]
}

// Nouvel état après une réponse. `known` = le joueur connaissait la carte.
export function answerState(state, id, known, now = Date.now()) {
  const prev = state[id]?.box ?? 0 // 0 = jamais vue
  const box = known ? Math.min(FLASH_BOXES, Math.max(1, prev) + 1) : 1
  return {
    ...state,
    [id]: { box, due: dueAfter(now, FLASH_INTERVAL_DAYS[box]), last: now },
  }
}

export function statsFrom(state, now = Date.now(), ids = ALL_IDS) {
  let learned = 0
  for (const id of ids) if (state[id]?.box === FLASH_BOXES) learned += 1
  return { due: dueFrom(state, now, ids).length, learned, total: ids.length }
}

// ===== API persistée =====
export function getDueCards(now = Date.now()) {
  return dueFrom(loadFlash(), now)
}

export function answer(id, known, now = Date.now()) {
  saveFlash(answerState(loadFlash(), id, known, now))
}

export function stats(now = Date.now()) {
  return statsFrom(loadFlash(), now)
}

export function resetFlash() {
  try {
    localStorage.removeItem(FLASH_KEY)
  } catch {
    /* ignore */
  }
}
