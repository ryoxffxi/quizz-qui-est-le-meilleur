import { describe, expect, it } from 'vitest'
import {
  DAILY_QUESTIONS,
  DIFFICULTIES,
  ERRORS_BATCH_SIZE,
  EXAM_PASS,
  EXAM_QUESTIONS,
  EXAM_READY_SCORE,
  EXAM_SIGN_QUESTIONS,
  EXAM_TIME_PER_QUESTION,
  SOLO_BATCH_SIZE,
  TIERS,
  maxRoundsForBank,
  personalityKey,
  scoreForAnswer,
  simulateFriendRun,
  tierOf,
} from './game'

describe('game : constantes du contrat', () => {
  it('expose les réglages examen / quotidien / erreurs', () => {
    expect(EXAM_QUESTIONS).toBe(40)
    expect(EXAM_PASS).toBe(35)
    expect(EXAM_TIME_PER_QUESTION).toBe(20)
    expect(EXAM_SIGN_QUESTIONS).toBe(8)
    expect(EXAM_READY_SCORE).toBe(37)
    expect(DAILY_QUESTIONS).toBe(10)
    expect(ERRORS_BATCH_SIZE).toBe(10)
    expect(SOLO_BATCH_SIZE).toBe(10)
  })

  it('les difficultés n’ont plus de libellé codé en dur (i18n)', () => {
    for (const d of Object.values(DIFFICULTIES)) {
      expect(d).not.toHaveProperty('label')
      expect(d.timePerQuestion).toBeGreaterThan(0)
      expect(d.basePoints).toBeGreaterThan(0)
    }
  })

  it('simulateFriendRun ne porte plus de nom (le libellé vient de t())', () => {
    const run = simulateFriendRun([{ id: 'a' }, { id: 'b' }, { id: 'c' }], 'facile')
    expect(run).not.toHaveProperty('name')
    expect(run.total).toBe(3)
    expect(run.correctCount).toBeGreaterThanOrEqual(0)
    expect(run.correctCount).toBeLessThanOrEqual(3)
    expect(run.score).toBeGreaterThanOrEqual(0)
  })
})

describe('paliers de réussite (tierOf / personalityKey)', () => {
  it('découpe en 5 paliers : 100 / ≥ 80 / ≥ 60 / ≥ 40 / < 40', () => {
    expect(tierOf(10, 10)).toBe('genius')
    expect(tierOf(9, 10)).toBe('great')
    expect(tierOf(8, 10)).toBe('great')
    expect(tierOf(7, 10)).toBe('good')
    expect(tierOf(6, 10)).toBe('good')
    expect(tierOf(5, 10)).toBe('meh')
    expect(tierOf(4, 10)).toBe('meh')
    expect(tierOf(3, 10)).toBe('bad')
    expect(tierOf(0, 10)).toBe('bad')
  })

  it('tient sur un examen de 40 et un dernier lot plus court', () => {
    expect(tierOf(40, 40)).toBe('genius')
    expect(tierOf(35, 40)).toBe('great') // 87,5 %
    expect(tierOf(3, 3)).toBe('genius')
    expect(tierOf(2, 3)).toBe('good') // 66,7 %
  })

  it('sans total (0 ou absent), palier bas et jamais d’exception', () => {
    expect(tierOf(0, 0)).toBe('bad')
    expect(tierOf(3, undefined)).toBe('bad')
    expect(TIERS).toEqual(['genius', 'great', 'good', 'meh', 'bad'])
  })

  it('personalityKey suit le palier', () => {
    expect(personalityKey(10, 10)).toBe('personality_genius')
    expect(personalityKey(8, 10)).toBe('personality_great')
    expect(personalityKey(6, 10)).toBe('personality_good')
    expect(personalityKey(4, 10)).toBe('personality_meh')
    expect(personalityKey(1, 10)).toBe('personality_bad')
  })
})

describe('scoreForAnswer', () => {
  it('rapporte entre 50 % et 100 % des points selon la vitesse, 0 si faux', () => {
    const base = { totalTime: 10, basePoints: 1000 }
    expect(scoreForAnswer({ correct: false, timeLeft: 10, ...base })).toBe(0)
    expect(scoreForAnswer({ correct: true, timeLeft: 10, ...base })).toBe(1000)
    expect(scoreForAnswer({ correct: true, timeLeft: 0, ...base })).toBe(500)
    expect(scoreForAnswer({ correct: true, timeLeft: -3, ...base })).toBe(500)
    expect(scoreForAnswer({ correct: true, timeLeft: 5, ...base })).toBe(750)
  })

  it('maxRoundsForBank plafonne à 8 manches', () => {
    expect(maxRoundsForBank(12)).toBe(2)
    expect(maxRoundsForBank(500)).toBe(8)
    expect(maxRoundsForBank(4)).toBe(0)
  })
})
