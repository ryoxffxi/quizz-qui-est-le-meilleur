import { describe, it, expect } from 'vitest'
import { isAppRoute, acceptsHtml, SECURITY_HEADERS } from './routes.js'

describe('isAppRoute', () => {
  it('reconnaît toutes les routes de l’App du contrat d’URL', () => {
    for (const p of [
      '/',
      '/jouer/code-route/facile',
      '/jouer/code-route/expert',
      '/jouer/culture-generale/facile',
      '/defi/manga-anime/expert',
      '/examen',
      '/quotidien',
      '/erreurs/panneaux',
      '/revision/panneaux',
      '/flashcards',
    ]) {
      expect(isAppRoute(p), p).toBe(true)
    }
  })

  it('tolère une barre oblique finale', () => {
    expect(isAppRoute('/examen/')).toBe(true)
    expect(isAppRoute('/jouer/code-route/facile/')).toBe(true)
  })

  it('refuse les pages statiques, /api et les chemins inconnus', () => {
    for (const p of [
      '/panneaux/',
      '/panneaux/stop',
      '/panneaux/pieges',
      '/quiz/',
      '/quiz/code-route',
      '/code-de-la-route/examen-blanc',
      '/a-propos',
      '/contact',
      '/confidentialite',
      '/conditions',
      '/404.html',
      '/api/ev',
      '/api/checkout',
      '/jouer',
      '/jouer/code-route',
      '/jouer/code-route/moyen',
      '/jouer/Code-Route/facile',
      '/defi/code-route',
      '/examen/blanc',
      '/erreurs',
      '/erreurs/',
      '/revision',
      '/revision/autre',
      '/flashcards/x',
      '/assets/index-abc.js',
      '/nimporte-quoi',
      '//examen',
    ]) {
      expect(isAppRoute(p), p).toBe(false)
    }
  })

  it('renvoie false pour une valeur qui n’est pas une chaîne', () => {
    expect(isAppRoute(undefined)).toBe(false)
    expect(isAppRoute(null)).toBe(false)
    expect(isAppRoute('')).toBe(false)
    expect(isAppRoute(42)).toBe(false)
  })
})

describe('acceptsHtml', () => {
  const req = (accept) =>
    new Request('https://ryo-offc.com/examen', { headers: accept ? { accept } : {} })

  it('vrai pour une navigation de navigateur', () => {
    expect(acceptsHtml(req('text/html,application/xhtml+xml,*/*;q=0.8'))).toBe(true)
    expect(acceptsHtml(req('TEXT/HTML'))).toBe(true)
  })

  it('faux pour un fetch JSON, « */* » seul ou sans en-tête', () => {
    expect(acceptsHtml(req('application/json'))).toBe(false)
    expect(acceptsHtml(req('*/*'))).toBe(false)
    expect(acceptsHtml(req(''))).toBe(false)
  })
})

describe('SECURITY_HEADERS', () => {
  it('contient les trois en-têtes de durcissement attendus', () => {
    expect(SECURITY_HEADERS).toEqual({
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-frame-options': 'SAMEORIGIN',
    })
  })
})
