// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { openPortal, bootstrapEntitlement, isPremium, PREMIUM_LIVE } from './premium'

const jsonRes = (body, status = 200) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) })

beforeEach(() => {
  localStorage.clear()
  // jsdom ne sait pas naviguer : il signale l'affectation de location.href par
  // une erreur virtuelle sur console.error, sans lever. On la tait.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('openPortal', () => {
  it('renvoie false sans jeton, sans appeler le backend', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    expect(await openPortal()).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('appelle POST /api/portal avec le jeton et renvoie true quand une URL revient', async () => {
    localStorage.setItem('quizz_token', 'jeton.de.test')
    const fetchSpy = vi.fn(() => jsonRes({ url: 'https://billing.stripe.com/p/session' }))
    vi.stubGlobal('fetch', fetchSpy)
    expect(await openPortal()).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/portal')
    expect(init).toMatchObject({ method: 'POST', headers: { authorization: 'Bearer jeton.de.test' } })
  })

  it('renvoie false sur 404 (pas de client Stripe), 401, réponse sans url, ou réseau coupé', async () => {
    localStorage.setItem('quizz_token', 'jeton.de.test')
    vi.stubGlobal('fetch', vi.fn(() => jsonRes({ error: 'no_customer' }, 404)))
    expect(await openPortal()).toBe(false)
    vi.stubGlobal('fetch', vi.fn(() => jsonRes({ error: 'unauthorized' }, 401)))
    expect(await openPortal()).toBe(false)
    vi.stubGlobal('fetch', vi.fn(() => jsonRes({})))
    expect(await openPortal()).toBe(false)
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('hors ligne'))))
    expect(await openPortal()).toBe(false)
  })
})

describe('bootstrapEntitlement', () => {
  it('au retour du portail (?portail=retour), resynchronise le statut et nettoie l’URL', async () => {
    localStorage.setItem('quizz_token', 'jeton.de.test')
    localStorage.setItem('quizz_premium', '1')
    window.history.replaceState(null, '', '/?portail=retour')
    const fetchSpy = vi.fn(() => jsonRes({ premium: false }))
    vi.stubGlobal('fetch', fetchSpy)
    await bootstrapEntitlement()
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/entitlement')
    expect(isPremium()).toBe(false)
    expect(window.location.search).toBe('')
    expect(window.location.pathname).toBe('/')
  })

  it('sans jeton, retire un cache premium falsifié', async () => {
    localStorage.setItem('quizz_premium', '1')
    window.history.replaceState(null, '', '/')
    vi.stubGlobal('fetch', vi.fn())
    await bootstrapEntitlement()
    expect(isPremium()).toBe(false)
  })

  it('garde session_id dans l’URL si /api/confirm échoue de façon transitoire', async () => {
    window.history.replaceState(null, '', '/?premium=success&session_id=cs_test_1')
    vi.stubGlobal('fetch', vi.fn(() => jsonRes({ error: 'server_error' }, 500)))
    await bootstrapEntitlement()
    expect(window.location.search).toContain('session_id=cs_test_1')

    vi.stubGlobal('fetch', vi.fn(() => jsonRes({ premium: true, token: 'a.b.c' })))
    await bootstrapEntitlement()
    expect(window.location.search).toBe('')
    expect(isPremium()).toBe(true)
    expect(localStorage.getItem('quizz_token')).toBe('a.b.c')
  })
})

describe('PREMIUM_LIVE', () => {
  it('reste à false tant que le go-live n’est pas décidé par le propriétaire', () => {
    expect(PREMIUM_LIVE).toBe(false)
  })
})
