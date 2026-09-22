// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DUELS_MAX,
  clearDuels,
  findDuel,
  getDuels,
  getPseudo,
  recordDuel,
  setPseudo,
} from './duels'

const KEY = 'quizz_duels'

const base = {
  seed: 42,
  cat: 'code-route',
  diff: 'facile',
  opponent: 'Alex',
  myScores: [4000, 3500],
  theirScores: [3800, 3900],
  status: 'played',
}

beforeEach(() => localStorage.clear())

describe('historique des duels (quizz_duels)', () => {
  it('vide au départ', () => {
    expect(getDuels()).toEqual([])
    expect(findDuel(1, 'code-route', 'facile')).toBeNull()
  })

  it('enregistre un duel, date ISO ajoutée, le plus récent d’abord', () => {
    recordDuel({ ...base, seed: 1 })
    recordDuel({ ...base, seed: 2 })
    const list = getDuels()
    expect(list.map((d) => d.seed)).toEqual([2, 1])
    expect(list[0]).toMatchObject({ cat: 'code-route', diff: 'facile', opponent: 'Alex', status: 'played' })
    expect(() => new Date(list[0].date).toISOString()).not.toThrow()
    expect(JSON.parse(localStorage.getItem(KEY))).toHaveLength(2)
  })

  it('même graine + catégorie + difficulté = même duel, mis à jour et remonté en tête', () => {
    recordDuel({ seed: 7, cat: 'code-route', diff: 'facile', myScores: [1000], status: 'sent' })
    recordDuel({ ...base, seed: 8 })
    // Réponse du pote : on apprend ses scores et son pseudo, sans perdre les nôtres.
    recordDuel({ seed: 7, cat: 'code-route', diff: 'facile', opponent: 'Sam', theirScores: [900], status: 'answered' })
    const list = getDuels()
    expect(list).toHaveLength(2)
    expect(list[0]).toMatchObject({
      seed: 7,
      opponent: 'Sam',
      myScores: [1000],
      theirScores: [900],
      status: 'answered',
    })
  })

  it('une mise à jour sans adversaire ni scores ne les efface pas', () => {
    recordDuel(base)
    recordDuel({ seed: 42, cat: 'code-route', diff: 'facile', status: 'answered' })
    expect(findDuel(42, 'code-route', 'facile')).toMatchObject({
      opponent: 'Alex',
      myScores: [4000, 3500],
      theirScores: [3800, 3900],
      status: 'answered',
    })
  })

  it('même graine dans une autre catégorie ou difficulté = autre duel', () => {
    recordDuel(base)
    recordDuel({ ...base, diff: 'expert' })
    recordDuel({ ...base, cat: 'manga-anime' })
    expect(getDuels()).toHaveLength(3)
  })

  it('plafonne à DUELS_MAX entrées (les plus anciennes sortent)', () => {
    for (let i = 0; i < DUELS_MAX + 5; i++) recordDuel({ ...base, seed: i })
    const list = getDuels()
    expect(list).toHaveLength(DUELS_MAX)
    expect(list[0].seed).toBe(DUELS_MAX + 4)
    expect(list.at(-1).seed).toBe(5)
  })

  it('ignore une entrée inutilisable et normalise ce qui est lu', () => {
    expect(recordDuel({ cat: 'x' })).toEqual([])
    expect(recordDuel(null)).toEqual([])
    localStorage.setItem(
      KEY,
      JSON.stringify([
        { seed: 1, cat: 'code-route', diff: 'facile', status: 'bizarre', myScores: 'x', opponent: 3 },
        'poubelle',
        { seed: 'nope', cat: 'code-route', diff: 'facile' },
      ]),
    )
    expect(getDuels()).toEqual([
      {
        seed: 1,
        cat: 'code-route',
        diff: 'facile',
        opponent: null,
        myScores: [],
        theirScores: [],
        date: '',
        status: 'sent',
      },
    ])
    localStorage.setItem(KEY, '{pas du json')
    expect(getDuels()).toEqual([])
  })

  it('clearDuels vide l’historique', () => {
    recordDuel(base)
    clearDuels()
    expect(getDuels()).toEqual([])
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})

describe('pseudo mémorisé (quizz_pseudo)', () => {
  it('vide par défaut, mémorisé une fois saisi, coupé à 20 caractères', () => {
    expect(getPseudo()).toBe('')
    setPseudo('  Zoé  ')
    expect(getPseudo()).toBe('Zoé')
    setPseudo('a'.repeat(30))
    expect(getPseudo()).toBe('a'.repeat(20))
  })

  it('un pseudo vide efface la mémoire', () => {
    setPseudo('Alex')
    setPseudo('   ')
    expect(getPseudo()).toBe('')
    expect(localStorage.getItem('quizz_pseudo')).toBeNull()
  })
})
