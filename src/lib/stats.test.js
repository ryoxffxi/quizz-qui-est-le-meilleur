// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// countQuestions lit counts.json : on fixe une banque de 249 questions.
vi.mock('../content', () => ({
  countQuestions: (cat, diff) => (cat === 'code-route' && diff === 'facile' ? 249 : 0),
}))

import {
  dayKey,
  getExamReadiness,
  getProgress,
  getStats,
  getStreak,
  recordAnswer,
  recordRound,
  statsKey,
} from './stats'
import { saveSeen } from './revision'
import { EXAM_READY_SCORE } from './game'

const KEY = 'quizz_stats'

// Se place à midi (heure locale) le jour donné.
function setDay(y, m, d) {
  vi.setSystemTime(new Date(y, m - 1, d, 12, 0, 0))
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  setDay(2026, 9, 7)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('stats v2 : structure et migration', () => {
  it('renvoie une structure v2 vide sans donnée', () => {
    const s = getStats()
    expect(s.v).toBe(2)
    expect(s.total).toEqual({ answered: 0, correct: 0 })
    expect(s.byKey).toEqual({})
    expect(s.days).toEqual([])
    expect(s.streak).toEqual({ current: 0, best: 0, last: null })
    expect(s.history).toEqual([])
  })

  it('migre l’ancien format { answered, correct } sans perdre les totaux', () => {
    localStorage.setItem(KEY, JSON.stringify({ answered: 120, correct: 90 }))
    const s = getStats()
    expect(s.v).toBe(2)
    expect(s.total).toEqual({ answered: 120, correct: 90 })
    // Après une réponse, la persistance est au format v2.
    recordAnswer('code-route', 'facile', true)
    const raw = JSON.parse(localStorage.getItem(KEY))
    expect(raw.v).toBe(2)
    expect(raw.total).toEqual({ answered: 121, correct: 91 })
  })

  it('survit à un contenu illisible ou partiel', () => {
    localStorage.setItem(KEY, '{pas du json')
    expect(getStats().total.answered).toBe(0)
    localStorage.setItem(KEY, JSON.stringify({ v: 2, byKey: { 'a:b': null }, days: 'x' }))
    const s = getStats()
    expect(s.byKey).toEqual({})
    expect(s.days).toEqual([])
  })
})

describe('recordAnswer', () => {
  it('cumule les totaux et la progression par clé', () => {
    recordAnswer('code-route', 'facile', true)
    recordAnswer('code-route', 'facile', false)
    recordAnswer('code-route', 'expert', true)
    const s = getStats()
    expect(s.total).toEqual({ answered: 3, correct: 2 })
    expect(s.byKey['code-route:facile']).toMatchObject({ answered: 2, correct: 1 })
    expect(s.byKey['code-route:expert']).toMatchObject({ answered: 1, correct: 1 })
    expect(s.days).toEqual(['2026-09-07'])
  })

  it('utilise le jour LOCAL et n’ajoute chaque jour qu’une fois', () => {
    // 23 h 30 heure locale : la date UTC peut déjà être le lendemain.
    vi.setSystemTime(new Date(2026, 8, 7, 23, 30))
    recordAnswer('code-route', 'facile', true)
    recordAnswer('code-route', 'facile', true)
    expect(getStats().days).toEqual([dayKey(new Date(2026, 8, 7, 23, 30))])
    expect(getStats().days).toEqual(['2026-09-07'])
  })
})

describe('série de jours (streak)', () => {
  it('monte sur des jours consécutifs, tolère le jour courant, casse au-delà', () => {
    setDay(2026, 9, 5)
    recordAnswer('code-route', 'facile', true)
    setDay(2026, 9, 6)
    recordAnswer('code-route', 'facile', false)
    setDay(2026, 9, 7)
    recordAnswer('code-route', 'facile', true)
    expect(getStreak()).toEqual({ current: 3, best: 3, playedToday: true })

    // Le lendemain sans avoir encore joué : la série reste vivante.
    setDay(2026, 9, 8)
    expect(getStreak()).toEqual({ current: 3, best: 3, playedToday: false })

    // Deux jours sans jouer : série cassée, le record reste.
    setDay(2026, 9, 9)
    expect(getStreak()).toEqual({ current: 0, best: 3, playedToday: false })

    // On rejoue : nouvelle série à 1.
    recordAnswer('code-route', 'facile', true)
    expect(getStreak()).toEqual({ current: 1, best: 3, playedToday: true })
  })

  it('ne compte pas deux fois le même jour', () => {
    recordAnswer('code-route', 'facile', true)
    recordAnswer('code-route', 'facile', true)
    expect(getStreak().current).toBe(1)
  })

  it('enjambe un changement de mois', () => {
    setDay(2026, 8, 31)
    recordAnswer('code-route', 'facile', true)
    setDay(2026, 9, 1)
    recordAnswer('code-route', 'facile', true)
    expect(getStreak().current).toBe(2)
  })
})

describe('recordRound', () => {
  it('garde le record par clé et compte les manches', () => {
    recordRound({ cat: 'code-route', diff: 'facile', mode: 'solo', score: 7, total: 10 })
    recordRound({ cat: 'code-route', diff: 'facile', mode: 'solo', score: 9, total: 10 })
    recordRound({ cat: 'code-route', diff: 'facile', mode: 'solo', score: 4, total: 10 })
    const b = getStats().byKey['code-route:facile']
    expect(b.best).toBe(9)
    expect(b.bestTotal).toBe(10)
    expect(b.rounds).toBe(3)
    expect(typeof b.lastPlayed).toBe('string')
  })

  it('range l’examen et le mode erreurs sous leur propre clé', () => {
    recordRound({ cat: 'code-route', mode: 'examen', score: 36, total: 40 })
    recordRound({ cat: 'code-route', mode: 'erreurs', score: 8, total: 10 })
    const s = getStats()
    expect(s.byKey['code-route:examen'].best).toBe(36)
    expect(s.byKey['code-route:erreurs'].best).toBe(8)
    expect(s.byKey['code-route:facile']).toBeUndefined()
    expect(statsKey('code-route', undefined, 'examen')).toBe('code-route:examen')
  })

  it('plafonne l’historique à 20 entrées, les plus récentes conservées', () => {
    for (let i = 1; i <= 25; i++) {
      recordRound({ cat: 'code-route', diff: 'facile', mode: 'solo', score: i, total: 25 })
    }
    const h = getStats().history
    expect(h).toHaveLength(20)
    expect(h[0].score).toBe(6)
    expect(h[19].score).toBe(25)
    expect(h[19]).toMatchObject({ cat: 'code-route', diff: 'facile', mode: 'solo', total: 25 })
  })
})

describe('getProgress', () => {
  it('combine banque, questions vues et précision', () => {
    saveSeen('code-route', 'facile', new Set(['a', 'b', 'c']))
    recordAnswer('code-route', 'facile', true)
    recordAnswer('code-route', 'facile', true)
    recordAnswer('code-route', 'facile', false)
    recordRound({ cat: 'code-route', diff: 'facile', mode: 'solo', score: 2, total: 3 })
    expect(getProgress('code-route', 'facile')).toEqual({
      seen: 3,
      total: 249,
      answered: 3,
      correct: 2,
      accuracy: 67,
      best: 2,
      bestTotal: 3,
    })
  })

  it('renvoie accuracy null sans réponse', () => {
    expect(getProgress('code-route', 'expert')).toMatchObject({ answered: 0, accuracy: null, best: 0 })
  })
})

describe('getExamReadiness', () => {
  it('moyenne des 3 derniers examens blancs', () => {
    expect(getExamReadiness()).toEqual({ exams: 0, avg: null, ready: false })
    recordRound({ cat: 'code-route', mode: 'examen', score: 30, total: 40 })
    recordRound({ cat: 'code-route', mode: 'examen', score: 36, total: 40 })
    recordRound({ cat: 'code-route', mode: 'examen', score: 38, total: 40 })
    recordRound({ cat: 'code-route', mode: 'examen', score: 38, total: 40 })
    // Les manches solo ne comptent pas.
    recordRound({ cat: 'code-route', diff: 'facile', mode: 'solo', score: 2, total: 10 })
    const r = getExamReadiness()
    expect(r.exams).toBe(4)
    expect(r.avg).toBeCloseTo((36 + 38 + 38) / 3, 1)
    expect(r.ready).toBe(r.avg >= EXAM_READY_SCORE)
    expect(r.ready).toBe(true)
  })
})
