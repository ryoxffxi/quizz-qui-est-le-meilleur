// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  MAX_ROUND_SCORE,
  buildChallengeUrl,
  buildResultUrl,
  clearChallengeUrl,
  decodeChallenge,
  decodeResult,
  encodeChallenge,
  encodeResult,
  readChallengeFromUrl,
  readResultFromUrl,
} from './challengeLink'
import { CHALLENGE_MAX_ROUNDS } from './game'

const invite = {
  p: 'Alex',
  c: 'code-route',
  d: 'facile',
  s: 123456789,
  n: 3,
  r: [4200, 3100, 5000],
  l: 'fr',
}

// Un payload forgé : même contenu, un champ remplacé.
const forged = (patch) => encodeChallenge({ ...invite, ...patch })

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('lien de défi (#defi=)', () => {
  it('encode puis décode un défi complet à l’identique', () => {
    expect(decodeChallenge(encodeChallenge(invite))).toEqual(invite)
  })

  it('accepte un pseudo accentué (UTF-8 en base64url, sans + / =)', () => {
    const enc = encodeChallenge({ ...invite, p: 'Zoé 🚗' })
    expect(enc).not.toMatch(/[+/=]/)
    expect(decodeChallenge(enc).p).toBe('Zoé 🚗')
  })

  it('les champs facultatifs peuvent manquer (anciens liens)', () => {
    expect(decodeChallenge(encodeChallenge({ c: 'code-route', d: 'expert', s: 1 }))).toEqual({
      c: 'code-route',
      d: 'expert',
      s: 1,
    })
  })

  it('ne renvoie que les champs connus', () => {
    const out = decodeChallenge(forged({ evil: '<script>', z: 1 }))
    expect(out).toEqual(invite)
    expect(out).not.toHaveProperty('evil')
  })

  it('rejette ce qui n’est pas un objet JSON valide', () => {
    expect(decodeChallenge('%%%')).toBeNull()
    expect(decodeChallenge(btoa('"texte"'))).toBeNull()
    expect(decodeChallenge(btoa('[1,2]'))).toBeNull()
    expect(decodeChallenge('')).toBeNull()
  })

  it('rejette une catégorie, une difficulté ou une graine invalides', () => {
    expect(decodeChallenge(forged({ c: 'Code Route' }))).toBeNull()
    expect(decodeChallenge(forged({ c: 42 }))).toBeNull()
    expect(decodeChallenge(forged({ d: 'moyen' }))).toBeNull()
    expect(decodeChallenge(forged({ s: 1.5 }))).toBeNull()
    expect(decodeChallenge(forged({ s: -1 }))).toBeNull()
    expect(decodeChallenge(forged({ s: 2 ** 32 }))).toBeNull()
    expect(decodeChallenge(forged({ s: '12' }))).toBeNull()
  })

  it('n : entier de 1 à CHALLENGE_MAX_ROUNDS (2.5, -3, 1e9 refusés)', () => {
    expect(decodeChallenge(forged({ n: 2.5 }))).toBeNull()
    expect(decodeChallenge(forged({ n: -3 }))).toBeNull()
    expect(decodeChallenge(forged({ n: 1e9 }))).toBeNull()
    expect(decodeChallenge(forged({ n: 0 }))).toBeNull()
    expect(decodeChallenge(forged({ n: CHALLENGE_MAX_ROUNDS + 1 }))).toBeNull()
    expect(decodeChallenge(forged({ n: CHALLENGE_MAX_ROUNDS })).n).toBe(CHALLENGE_MAX_ROUNDS)
  })

  it('r : tableau de 8 scores entiers max, bornés (lien forgé refusé)', () => {
    expect(decodeChallenge(forged({ r: 'abc' }))).toBeNull()
    expect(decodeChallenge(forged({ r: [1, 'x'] }))).toBeNull()
    expect(decodeChallenge(forged({ r: [-5] }))).toBeNull()
    expect(decodeChallenge(forged({ r: [MAX_ROUND_SCORE + 1] }))).toBeNull()
    expect(decodeChallenge(forged({ r: [1.5] }))).toBeNull()
    expect(decodeChallenge(forged({ r: new Array(CHALLENGE_MAX_ROUNDS + 1).fill(0) }))).toBeNull()
    expect(decodeChallenge(forged({ r: [] })).r).toEqual([])
    expect(decodeChallenge(forged({ r: [0, MAX_ROUND_SCORE] })).r).toEqual([0, MAX_ROUND_SCORE])
  })

  it('l : seulement fr / en / es / pt', () => {
    expect(decodeChallenge(forged({ l: 'de' }))).toBeNull()
    expect(decodeChallenge(forged({ l: 'pt' })).l).toBe('pt')
  })

  it('p : 24 caractères max, sans caractère de contrôle', () => {
    expect(decodeChallenge(forged({ p: 'a'.repeat(25) }))).toBeNull()
    expect(decodeChallenge(forged({ p: 'Al\nex' }))).toBeNull()
    expect(decodeChallenge(forged({ p: 12 }))).toBeNull()
    expect(decodeChallenge(forged({ p: 'a'.repeat(24) })).p).toBe('a'.repeat(24))
  })

  it('construit un lien sur la racine et le relit depuis l’adresse', () => {
    const url = buildChallengeUrl(invite)
    expect(url.startsWith(`${window.location.origin}/#defi=`)).toBe(true)
    window.location.hash = url.slice(url.indexOf('#'))
    expect(readChallengeFromUrl()).toEqual(invite)
    clearChallengeUrl()
    expect(window.location.hash).toBe('')
    expect(readChallengeFromUrl()).toBeNull()
  })
})

describe('lien de résultat (#resultat=)', () => {
  const solo = { solo: 1, c: 'code-route', d: 'facile', l: 'fr', sc: 8, tot: 10 }
  const duel = {
    c: 'code-route',
    d: 'expert',
    l: 'en',
    n: 2,
    p1: 'Sam',
    r1: [3000, 2500],
    p2: 'Alex',
    r2: [2800, 2900],
    s: 42,
  }

  it('solo : aller-retour avec mode et grille', () => {
    const data = { ...solo, mode: 'examen', grid: '🟩🟩🟥\n🟩' }
    expect(decodeResult(encodeResult(data))).toEqual(data)
  })

  it('solo : score, mode et grille sont validés', () => {
    expect(decodeResult(encodeResult({ ...solo, sc: -1 }))).toBeNull()
    expect(decodeResult(encodeResult({ ...solo, sc: 1.5 }))).toBeNull()
    expect(decodeResult(encodeResult({ ...solo, tot: 'dix' }))).toBeNull()
    expect(decodeResult(encodeResult({ ...solo, mode: 'triche' }))).toBeNull()
    expect(decodeResult(encodeResult({ ...solo, grid: '<b>x</b>' }))).toBeNull()
    expect(decodeResult(encodeResult({ ...solo, grid: '🟩'.repeat(121) }))).toBeNull()
    expect(decodeResult(encodeResult({ ...solo, mode: 'defi' })).mode).toBe('defi')
  })

  it('duel : aller-retour avec graine et manches (s, n)', () => {
    expect(decodeResult(encodeResult(duel))).toEqual(duel)
  })

  it('duel : s et n sont facultatifs (anciens liens) mais validés', () => {
    const old = { c: 'code-route', d: 'facile', p1: 'A', r1: [1], p2: 'B', r2: [2] }
    expect(decodeResult(encodeResult(old))).toEqual(old)
    expect(decodeResult(encodeResult({ ...duel, s: 'x' }))).toBeNull()
    expect(decodeResult(encodeResult({ ...duel, n: 9 }))).toBeNull()
    expect(decodeResult(encodeResult({ ...duel, n: 0 }))).toBeNull()
  })

  it('duel : scores et pseudos sont validés', () => {
    expect(decodeResult(encodeResult({ ...duel, r1: null }))).toBeNull()
    expect(decodeResult(encodeResult({ ...duel, r2: [1e9] }))).toBeNull()
    expect(decodeResult(encodeResult({ ...duel, p1: 'a'.repeat(30) }))).toBeNull()
    expect(decodeResult(encodeResult({ ...duel, c: '../x' }))).toBeNull()
  })

  it('construit un lien sur la racine et le relit', () => {
    const url = buildResultUrl(duel)
    expect(url.startsWith(`${window.location.origin}/#resultat=`)).toBe(true)
    window.location.hash = url.slice(url.indexOf('#'))
    expect(readResultFromUrl()).toEqual(duel)
    expect(readChallengeFromUrl()).toBeNull()
  })
})
