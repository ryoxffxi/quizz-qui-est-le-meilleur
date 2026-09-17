import { describe, expect, it } from 'vitest'
import {
  buildChallengeDeck,
  hashString,
  mulberry32,
  randomSeed,
  rankOf,
  seededDeck,
  shuffle,
  shuffleOptions,
} from './quiz'

// Banque de 30 questions aux ids « réels » (ne diffèrent que par la fin).
const pool = Array.from({ length: 30 }, (_, i) => ({
  id: `route_${String(i + 1).padStart(4, '0')}`,
  question: `Question ${i + 1}`,
  options: ['A', 'B', 'C', 'D'],
  correct: i % 4,
  optionImages: ['ia', 'ib', 'ic', 'id'],
}))
const ids = (deck) => deck.map((q) => q.id)

describe('shuffleOptions / shuffle', () => {
  it('permute options ET optionImages ensemble, correct recalculé (copie)', () => {
    const q = {
      id: 'x',
      options: ['un', 'deux', 'trois', 'quatre'],
      optionImages: ['i1', 'i2', 'i3', 'i4'],
      correct: 2,
    }
    for (let k = 0; k < 20; k++) {
      const out = shuffleOptions(q)
      expect(out).not.toBe(q)
      expect([...out.options].sort()).toEqual([...q.options].sort())
      expect(out.options[out.correct]).toBe('trois')
      // Chaque image suit son option.
      out.options.forEach((opt, i) => {
        expect(out.optionImages[i]).toBe(q.optionImages[q.options.indexOf(opt)])
      })
    }
    expect(q.correct).toBe(2)
    expect(q.options).toEqual(['un', 'deux', 'trois', 'quatre'])
  })

  it('sans optionImages, n’en invente pas', () => {
    const out = shuffleOptions({ id: 'y', options: ['a', 'b', 'c'], correct: 0 })
    expect(out).not.toHaveProperty('optionImages')
    expect(out.options[out.correct]).toBe('a')
  })

  it('shuffle renvoie une copie contenant les mêmes éléments', () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8]
    const out = shuffle(src)
    expect(out).not.toBe(src)
    expect([...out].sort((a, b) => a - b)).toEqual(src)
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})

describe('hashString / mulberry32 / randomSeed', () => {
  it('hashString est un FNV-1a 32 bits (valeurs de référence)', () => {
    expect(hashString('')).toBe(0x811c9dc5)
    expect(hashString('a')).toBe(0xe40c292c)
    expect(hashString('foobar')).toBe(0xbf9cf968)
  })

  it('mulberry32 est reproductible, borné dans [0, 1) et dépend de la graine', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const seqA = [a(), a(), a()]
    const seqB = [b(), b(), b()]
    expect(seqA).toEqual(seqB)
    seqA.forEach((x) => {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    })
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })

  it('randomSeed est un entier sur 32 bits (encodable dans un lien)', () => {
    for (let i = 0; i < 50; i++) {
      const s = randomSeed()
      expect(Number.isInteger(s)).toBe(true)
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(0xffffffff)
    }
  })

  it('rankOf brasse la fin des ids (pas de blocs consécutifs)', () => {
    // Les ids route_0010..route_0019 ne doivent pas sortir en bloc.
    const deck = ids(seededDeck(pool, 'bloc', 10))
    const prefixes = new Set(deck.map((id) => id.slice(0, 9)))
    expect(prefixes.size).toBeGreaterThan(1)
    expect(rankOf('bloc', 'route_0010')).not.toBe(rankOf('bloc', 'route_0011'))
  })
})

describe('seededDeck (tirage déterministe par graine)', () => {
  // Valeurs figées : elles garantissent que les liens en circulation donnent
  // toujours les mêmes questions dans le même ordre. Ne pas les « réparer ».
  const GOLDEN_IDS = [
    'route_0014',
    'route_0012',
    'route_0023',
    'route_0022',
    'route_0008',
    'route_0002',
    'route_0007',
    'route_0016',
    'route_0009',
    'route_0029',
  ]
  const GOLDEN_OPTIONS = ['CBDA', 'ACBD', 'DBCA', 'DCBA', 'DCAB', 'BCAD', 'CDAB', 'CBAD', 'DCBA', 'ACDB']
  const GOLDEN_CORRECT = [1, 3, 2, 2, 0, 0, 0, 3, 3, 0]

  it('golden : même banque + même graine → mêmes ids, même ordre d’options', () => {
    const deck = seededDeck(pool, 'golden', 10)
    expect(ids(deck)).toEqual(GOLDEN_IDS)
    expect(deck.map((q) => q.options.join(''))).toEqual(GOLDEN_OPTIONS)
    expect(deck.map((q) => q.correct)).toEqual(GOLDEN_CORRECT)
    // La bonne réponse suit la permutation ; les images aussi.
    deck.forEach((q) => {
      const src = pool.find((p) => p.id === q.id)
      expect(q.options[q.correct]).toBe(src.options[src.correct])
      q.options.forEach((opt, i) => {
        expect(q.optionImages[i]).toBe(src.optionImages[src.options.indexOf(opt)])
      })
    })
  })

  it('deux appels (et deux ordres de banque) donnent le même paquet', () => {
    const a = seededDeck(pool, 'golden', 10)
    const b = seededDeck([...pool].reverse(), 'golden', 10)
    expect(a).toEqual(b)
  })

  it('une autre graine donne un autre paquet ; la graine numérique est acceptée', () => {
    expect(ids(seededDeck(pool, 'autre', 10))).not.toEqual(GOLDEN_IDS)
    expect(seededDeck(pool, 123, 5)).toEqual(seededDeck(pool, '123', 5))
  })

  it('ajout d’une question étrangère (hors classement) → paquet inchangé', () => {
    const bigger = [...pool, { ...pool[0], id: 'route_9006' }]
    expect(seededDeck(bigger, 'golden', 10)).toEqual(seededDeck(pool, 'golden', 10))
  })

  it('ajout d’une question mieux classée → une seule question remplacée, ordre conservé', () => {
    const bigger = [...pool, { ...pool[0], id: 'route_9008' }]
    const next = ids(seededDeck(bigger, 'golden', 10))
    expect(next).toEqual(['route_9008', ...GOLDEN_IDS.slice(0, 9)])
  })

  it('retrait d’une question du paquet → une seule remplacée, les autres gardent leur ordre', () => {
    const smaller = pool.filter((q) => q.id !== 'route_0008')
    const next = ids(seededDeck(smaller, 'golden', 10))
    expect(next).toEqual([...GOLDEN_IDS.filter((id) => id !== 'route_0008'), 'route_0010'])
  })

  it('count > banque → toute la banque ; copies indépendantes de la banque', () => {
    const deck = seededDeck(pool, 'golden', 100)
    expect(deck).toHaveLength(pool.length)
    expect(new Set(ids(deck)).size).toBe(pool.length)
    deck[0].options.push('Z')
    deck[0].correct = 99
    expect(pool.every((q) => q.options.length === 4 && q.correct < 4)).toBe(true)
    expect(seededDeck(pool, 'golden', 0)).toEqual([])
  })

  it('buildChallengeDeck(pool, seed, total) = seededDeck(pool, String(seed), total)', () => {
    expect(buildChallengeDeck(pool, 987654321, 15)).toEqual(seededDeck(pool, '987654321', 15))
    expect(ids(buildChallengeDeck(pool, 1, 15))).not.toEqual(ids(buildChallengeDeck(pool, 2, 15)))
  })
})
