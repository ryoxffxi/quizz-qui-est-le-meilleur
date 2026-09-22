// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  FLASH_BOXES,
  FLASH_KEY,
  answer,
  answerState,
  dueAfter,
  dueFrom,
  getDueCards,
  loadFlash,
  resetFlash,
  stats,
  statsFrom,
} from './flashcards'
import { SIGNS } from '../content/panneaux/signs'

// Un mardi 15 h, heure locale : les échéances tombent à minuit local.
const NOW = new Date(2026, 8, 8, 15, 0, 0).getTime()
const midnight = (days) => {
  const d = new Date(NOW)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

describe('flashcards (fonctions pures)', () => {
  it('dueAfter : minuit local, n jours plus tard', () => {
    expect(dueAfter(NOW, 1)).toBe(midnight(1))
    expect(dueAfter(NOW, 7)).toBe(midnight(7))
    expect(new Date(dueAfter(NOW, 3)).getHours()).toBe(0)
  })

  it('une carte jamais vue est due tout de suite', () => {
    const due = dueFrom({}, NOW, ['a', 'b'])
    expect(due).toEqual(['a', 'b'])
  })

  it('progression : nouvelle -> boîte 2 -> boîte 3, plafonnée à 3', () => {
    let s = answerState({}, 'x', true, NOW)
    expect(s.x.box).toBe(2)
    expect(s.x.due).toBe(midnight(3))
    s = answerState(s, 'x', true, NOW)
    expect(s.x.box).toBe(3)
    expect(s.x.due).toBe(midnight(7))
    s = answerState(s, 'x', true, NOW)
    expect(s.x.box).toBe(FLASH_BOXES)
    expect(s.x.due).toBe(midnight(7))
  })

  it('une carte ratée retombe en boîte 1, due le lendemain', () => {
    let s = { x: { box: 3, due: NOW - 1, last: NOW - 1 } }
    s = answerState(s, 'x', false, NOW)
    expect(s.x.box).toBe(1)
    expect(s.x.due).toBe(midnight(1))
    // Nouvelle carte ratée : boîte 1 aussi.
    const n = answerState({}, 'y', false, NOW)
    expect(n.y.box).toBe(1)
    expect(n.y.due).toBe(midnight(1))
  })

  it("échéances : une carte n'est due qu'à partir de minuit", () => {
    const s = answerState({}, 'x', false, NOW)
    expect(dueFrom(s, NOW, ['x'])).toEqual([])
    expect(dueFrom(s, midnight(1) - 1, ['x'])).toEqual([])
    expect(dueFrom(s, midnight(1), ['x'])).toEqual(['x'])
  })

  it('ordre : dues les plus anciennes, puis les nouvelles dans l’ordre de la banque', () => {
    const s = {
      a: { box: 2, due: NOW - 5000 },
      b: { box: 1, due: NOW - 9000 },
      c: { box: 3, due: NOW + 9000 },
    }
    expect(dueFrom(s, NOW, ['a', 'b', 'c', 'd', 'e'])).toEqual(['b', 'a', 'd', 'e'])
  })

  it('answerState ne mute pas l’état reçu', () => {
    const s = { x: { box: 1, due: 0 } }
    const next = answerState(s, 'x', true, NOW)
    expect(s.x.box).toBe(1)
    expect(next).not.toBe(s)
  })

  it('statsFrom : dues, acquises (boîte 3), total', () => {
    const s = {
      a: { box: 3, due: NOW + 1 },
      b: { box: 3, due: NOW - 1 },
      c: { box: 1, due: NOW + 1 },
    }
    expect(statsFrom(s, NOW, ['a', 'b', 'c', 'd'])).toEqual({ due: 2, learned: 2, total: 4 })
  })
})

describe('flashcards (persistance localStorage)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('au départ, toutes les cartes de la banque sont dues', () => {
    expect(getDueCards(NOW)).toHaveLength(SIGNS.length)
    expect(stats(NOW)).toEqual({ due: SIGNS.length, learned: 0, total: SIGNS.length })
  })

  it('answer écrit sous quizz_flash et retire la carte des dues', () => {
    const id = SIGNS[0].id
    answer(id, true, NOW)
    const raw = JSON.parse(localStorage.getItem(FLASH_KEY))
    expect(raw[id].box).toBe(2)
    expect(getDueCards(NOW)).not.toContain(id)
    expect(getDueCards(midnight(3))).toContain(id)
  })

  it('un stockage corrompu ou absent repart de zéro', () => {
    localStorage.setItem(FLASH_KEY, '{oops')
    expect(loadFlash()).toEqual({})
    localStorage.setItem(FLASH_KEY, '[1,2]')
    expect(loadFlash()).toEqual({})
    resetFlash()
    expect(localStorage.getItem(FLASH_KEY)).toBeNull()
  })

  it('les ids inconnus dans le stockage sont ignorés', () => {
    localStorage.setItem(FLASH_KEY, JSON.stringify({ fantome: { box: 3, due: 0 } }))
    expect(stats(NOW).learned).toBe(0)
    expect(getDueCards(NOW)).toHaveLength(SIGNS.length)
  })
})
