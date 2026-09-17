// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DAILY_QUESTIONS } from './game'
import {
  buildDailyDeck,
  dailySeed,
  getDailyState,
  hasPlayedToday,
  nextMidnightMs,
  saveDailyResult,
  todayKey,
} from './daily'

const at = (iso) => new Date(iso)
const HOUR = 3600000

const pool = Array.from({ length: 30 }, (_, i) => ({
  id: `q_${i}`,
  question: `Question ${i}`,
  options: ['a', 'b', 'c', 'd'],
  correct: 2,
  explanation: 'x',
  difficulty: i % 2 ? 'expert' : 'facile',
}))

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(at('2026-09-07T12:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('todayKey', () => {
  it('rend une clé YYYY-MM-DD', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(todayKey()).toBe('2026-09-07')
  })

  it('suit le jour civil de Paris, pas l’UTC', () => {
    expect(todayKey(at('2026-09-07T21:30:00Z'))).toBe('2026-09-07') // 23h30 à Paris (été)
    expect(todayKey(at('2026-09-07T22:30:00Z'))).toBe('2026-09-08') // 00h30 le lendemain
    expect(todayKey(at('2026-01-15T22:30:00Z'))).toBe('2026-01-15') // 23h30 (hiver)
    expect(todayKey(at('2026-01-15T23:30:00Z'))).toBe('2026-01-16') // 00h30
  })
})

describe('dailySeed / buildDailyDeck', () => {
  it('construit une graine lisible par jour et par catégorie', () => {
    expect(dailySeed('2026-09-07', 'manga-anime')).toBe('daily:2026-09-07:manga-anime')
  })

  it('tire DAILY_QUESTIONS questions, stables pour un même jour et une même catégorie', () => {
    const a = buildDailyDeck(pool, '2026-09-07', 'manga-anime')
    const b = buildDailyDeck(pool, '2026-09-07', 'manga-anime')
    expect(a).toHaveLength(DAILY_QUESTIONS)
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id))
    expect(a.map((q) => q.options)).toEqual(b.map((q) => q.options))
    expect(new Set(a.map((q) => q.id)).size).toBe(DAILY_QUESTIONS)
  })

  it('change de paquet quand le jour ou la catégorie change', () => {
    const base = buildDailyDeck(pool, '2026-09-07', 'manga-anime').map((q) => q.id)
    const nextDay = buildDailyDeck(pool, '2026-09-08', 'manga-anime').map((q) => q.id)
    const otherCat = buildDailyDeck(pool, '2026-09-07', 'cinema-series').map((q) => q.id)
    expect(nextDay).not.toEqual(base)
    expect(otherCat).not.toEqual(base)
  })

  it('renvoie des copies dont la bonne réponse suit le mélange des options', () => {
    const deck = buildDailyDeck(pool, '2026-09-07', 'culture-generale')
    deck.forEach((q) => {
      expect(pool).not.toContain(q)
      expect(q.options[q.correct]).toBe('c')
    })
  })
})

describe('état du jour (quizz_daily)', () => {
  it('démarre vierge pour la date du jour', () => {
    expect(getDailyState()).toEqual({ date: '2026-09-07', results: {} })
    expect(hasPlayedToday('manga-anime')).toBe(false)
  })

  it('mémorise le résultat d’une catégorie sans toucher aux autres', () => {
    saveDailyResult('manga-anime', { score: 8, grid: '🟩🟩🟥' })
    expect(hasPlayedToday('manga-anime')).toBe(true)
    expect(hasPlayedToday('cinema-series')).toBe(false)
    const entry = getDailyState().results['manga-anime']
    expect(entry).toMatchObject({ score: 8, grid: '🟩🟩🟥' })
    expect(typeof entry.ts).toBe('number')
    expect(JSON.parse(localStorage.getItem('quizz_daily')).date).toBe('2026-09-07')
  })

  it('repart de zéro quand la date change', () => {
    saveDailyResult('manga-anime', { score: 8, grid: '🟩' })
    vi.setSystemTime(at('2026-09-08T06:00:00Z'))
    expect(getDailyState()).toEqual({ date: '2026-09-08', results: {} })
    expect(hasPlayedToday('manga-anime')).toBe(false)
    saveDailyResult('cinema-series', { score: 5, grid: '🟥' })
    expect(Object.keys(getDailyState().results)).toEqual(['cinema-series'])
  })

  it('bascule au minuit de Paris, pas à minuit UTC', () => {
    vi.setSystemTime(at('2026-09-07T21:00:00Z')) // 23h à Paris
    saveDailyResult('manga-anime', { score: 8, grid: '🟩' })
    vi.setSystemTime(at('2026-09-07T22:30:00Z')) // 00h30 le 8 à Paris
    expect(hasPlayedToday('manga-anime')).toBe(false)
  })

  it('ignore un stockage illisible', () => {
    localStorage.setItem('quizz_daily', 'pas du json')
    expect(getDailyState()).toEqual({ date: '2026-09-07', results: {} })
    localStorage.setItem('quizz_daily', JSON.stringify({ date: 42 }))
    expect(getDailyState().results).toEqual({})
  })
})

describe('nextMidnightMs', () => {
  it('compte jusqu’au prochain minuit de Paris', () => {
    expect(nextMidnightMs(at('2026-09-07T10:00:00Z'))).toBe(12 * HOUR) // 12h à Paris (été)
    expect(nextMidnightMs(at('2026-09-07T22:30:00Z'))).toBe(23.5 * HOUR) // 00h30
    expect(nextMidnightMs(at('2026-01-15T22:30:00Z'))).toBe(0.5 * HOUR) // 23h30 (hiver)
    expect(nextMidnightMs(at('2026-09-07T10:00:00.250Z'))).toBe(12 * HOUR - 250)
  })

  it('utilise l’heure courante par défaut', () => {
    vi.setSystemTime(at('2026-09-07T20:00:00Z')) // 22h à Paris
    expect(nextMidnightMs()).toBe(2 * HOUR)
  })

  it('reste juste les jours de changement d’heure', () => {
    // 25 octobre 2026 : journée de 25 h (retour à l'heure d'hiver à 3h).
    expect(nextMidnightMs(at('2026-10-24T23:30:00Z'))).toBe(23.5 * HOUR)
    // 29 mars 2026 : journée de 23 h (passage à l'heure d'été à 2h).
    expect(nextMidnightMs(at('2026-03-29T00:30:00Z'))).toBe(21.5 * HOUR)
  })

  it('tombe bien sur un changement de clé de jour', () => {
    const now = at('2026-09-07T15:12:33Z')
    const left = nextMidnightMs(now)
    expect(todayKey(new Date(now.getTime() + left))).toBe('2026-09-08')
    expect(todayKey(new Date(now.getTime() + left - 1000))).toBe('2026-09-07')
  })
})
