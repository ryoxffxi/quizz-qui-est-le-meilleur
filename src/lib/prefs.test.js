// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, PREFS_KEY, getPrefs, resetPrefs, sanitizePrefs, setPrefs } from './prefs'

beforeEach(() => {
  localStorage.clear()
})

describe('getPrefs : valeurs par défaut et migration', () => {
  it('sans stockage → valeurs par défaut', () => {
    expect(getPrefs()).toEqual(DEFAULT_PREFS)
    expect(getPrefs()).toEqual({
      tab: 'quiz',
      mode: 'solo',
      difficulty: 'facile',
      lastCategory: null,
      dailyCategory: null,
    })
  })

  it('stockage illisible (JSON cassé, tableau, chaîne) → valeurs par défaut', () => {
    localStorage.setItem(PREFS_KEY, '{oops')
    expect(getPrefs()).toEqual(DEFAULT_PREFS)
    localStorage.setItem(PREFS_KEY, '[1,2]')
    expect(getPrefs()).toEqual(DEFAULT_PREFS)
    localStorage.setItem(PREFS_KEY, '"panneaux"')
    expect(getPrefs()).toEqual(DEFAULT_PREFS)
  })

  it('ancienne forme partielle ou champs inconnus → complétée, sans les extras', () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ difficulty: 'expert', theme: 'crimson', v: 0 }))
    expect(getPrefs()).toEqual({ ...DEFAULT_PREFS, difficulty: 'expert' })
  })

  it('valeurs hors domaine → défaut champ par champ', () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ tab: 'x', mode: 'duo', difficulty: 'moyen', lastCategory: 42, dailyCategory: 'bogus' }),
    )
    expect(getPrefs()).toEqual(DEFAULT_PREFS)
  })

  it('catégories connues conservées, catégorie supprimée oubliée', () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ lastCategory: 'code-route', dailyCategory: 'histoire-geo' }),
    )
    expect(getPrefs()).toEqual({ ...DEFAULT_PREFS, lastCategory: 'code-route', dailyCategory: null })
  })
})

describe('setPrefs', () => {
  it('fusionne un patch, persiste avec un numéro de version et renvoie le tout', () => {
    const next = setPrefs({ tab: 'panneaux', mode: 'challenge' })
    expect(next).toEqual({ ...DEFAULT_PREFS, tab: 'panneaux', mode: 'challenge' })
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY))
    expect(stored.v).toBe(1)
    expect(stored.tab).toBe('panneaux')
    expect(getPrefs()).toEqual(next)
  })

  it('un patch invalide ne casse rien', () => {
    setPrefs({ difficulty: 'expert' })
    expect(setPrefs({ difficulty: 'ultra', tab: null, foo: 'bar' })).toEqual({
      ...DEFAULT_PREFS,
      difficulty: 'facile',
    })
    expect(setPrefs(null)).toEqual(DEFAULT_PREFS)
    expect(setPrefs(undefined)).toEqual(DEFAULT_PREFS)
  })

  it('setPrefs successifs conservent les autres champs', () => {
    setPrefs({ lastCategory: 'manga-anime' })
    setPrefs({ difficulty: 'expert' })
    setPrefs({ dailyCategory: 'cinema-series' })
    expect(getPrefs()).toEqual({
      ...DEFAULT_PREFS,
      lastCategory: 'manga-anime',
      difficulty: 'expert',
      dailyCategory: 'cinema-series',
    })
  })

  it('resetPrefs efface la clé', () => {
    setPrefs({ mode: 'challenge' })
    expect(resetPrefs()).toEqual(DEFAULT_PREFS)
    expect(localStorage.getItem(PREFS_KEY)).toBeNull()
    expect(getPrefs()).toEqual(DEFAULT_PREFS)
  })
})

describe('sanitizePrefs (pure)', () => {
  it('ne modifie pas son entrée et ignore les non-objets', () => {
    const raw = { tab: 'panneaux', extra: 1 }
    const out = sanitizePrefs(raw)
    expect(out).toEqual({ ...DEFAULT_PREFS, tab: 'panneaux' })
    expect(raw).toEqual({ tab: 'panneaux', extra: 1 })
    expect(sanitizePrefs(null)).toEqual(DEFAULT_PREFS)
    expect(sanitizePrefs('x')).toEqual(DEFAULT_PREFS)
  })
})
