// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { clearErrors, countErrors, getErrorIds, recordFail, recordSuccess } from './errors'

const CAT = 'code-route'
const KEY = `quizz_errors_${CAT}`

beforeEach(() => localStorage.clear())

describe('banque d’erreurs', () => {
  it('une erreur entre dans la banque, avec son compteur', () => {
    recordFail(CAT, 'q1')
    recordFail(CAT, 'q1')
    expect(countErrors(CAT)).toBe(1)
    const bank = JSON.parse(localStorage.getItem(KEY))
    expect(bank.q1.fails).toBe(2)
    expect(bank.q1.okStreak).toBe(0)
    expect(typeof bank.q1.last).toBe('string')
  })

  it('deux réussites consécutives retirent la question', () => {
    recordFail(CAT, 'q1')
    recordSuccess(CAT, 'q1')
    expect(countErrors(CAT)).toBe(1)
    recordSuccess(CAT, 'q1')
    expect(countErrors(CAT)).toBe(0)
    // Banque vide : la clé est retirée du stockage.
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('une erreur entre deux réussites remet la série à zéro', () => {
    recordFail(CAT, 'q1')
    recordSuccess(CAT, 'q1')
    recordFail(CAT, 'q1')
    recordSuccess(CAT, 'q1')
    expect(countErrors(CAT)).toBe(1)
    expect(JSON.parse(localStorage.getItem(KEY)).q1.fails).toBe(2)
  })

  it('une réussite sur une question hors banque est sans effet', () => {
    recordSuccess(CAT, 'inconnue')
    expect(countErrors(CAT)).toBe(0)
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('getErrorIds renvoie les plus ratées d’abord', () => {
    recordFail(CAT, 'a')
    recordFail(CAT, 'b')
    recordFail(CAT, 'b')
    recordFail(CAT, 'c')
    recordFail(CAT, 'c')
    recordFail(CAT, 'c')
    expect(getErrorIds(CAT)).toEqual(['c', 'b', 'a'])
  })

  it('getErrorIds(cat, validIds) ignore et purge les ids absents de la banque courante', () => {
    recordFail(CAT, 'a')
    recordFail(CAT, 'disparue')
    recordFail(CAT, 'disparue')
    recordFail(CAT, 'b')
    recordFail(CAT, 'b') // b (2 échecs) avant a (1), quelle que soit l'horloge
    expect(countErrors(CAT)).toBe(3)
    expect(getErrorIds(CAT, new Set(['a', 'b', 'c']))).toEqual(['b', 'a'])
    // Purgée du stockage : le compteur et une lecture sans filtre suivent.
    expect(countErrors(CAT)).toBe(2)
    expect(getErrorIds(CAT)).toEqual(['b', 'a'])
    expect(Object.keys(JSON.parse(localStorage.getItem(KEY))).sort()).toEqual(['a', 'b'])
    // Un tableau d'ids convient aussi ; tout absent → banque vidée, clé retirée.
    expect(getErrorIds(CAT, ['a'])).toEqual(['a'])
    expect(getErrorIds(CAT, [])).toEqual([])
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('getErrorIds sans validIds ne purge rien', () => {
    recordFail(CAT, 'a')
    recordFail(CAT, 'disparue')
    expect(getErrorIds(CAT)).toHaveLength(2)
    expect(countErrors(CAT)).toBe(2)
  })

  it('les catégories sont isolées et clearErrors vide la bonne', () => {
    recordFail(CAT, 'a')
    recordFail('manga-anime', 'm1')
    clearErrors(CAT)
    expect(countErrors(CAT)).toBe(0)
    expect(countErrors('manga-anime')).toBe(1)
  })

  it('tolère un stockage illisible', () => {
    localStorage.setItem(KEY, '[1,2')
    expect(getErrorIds(CAT)).toEqual([])
    localStorage.setItem(KEY, '[1,2]')
    expect(countErrors(CAT)).toBe(0)
    recordFail(CAT, 'x')
    expect(getErrorIds(CAT)).toEqual(['x'])
  })
})
