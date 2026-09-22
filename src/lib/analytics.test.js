// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { track, EVENT_NAMES } from './analytics'

// Lecture d'un Blob compatible jsdom (text() peut manquer selon la version).
function blobText(blob) {
  if (typeof blob.text === 'function') return blob.text()
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = () => reject(r.error)
    r.readAsText(blob)
  })
}

function setBeacon(fn) {
  Object.defineProperty(navigator, 'sendBeacon', { value: fn, configurable: true, writable: true })
}

afterEach(() => {
  delete navigator.sendBeacon
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('track', () => {
  it('envoie un JSON { e, c } vers /api/ev via sendBeacon, contexte nettoyé', async () => {
    const beacon = vi.fn(() => true)
    setBeacon(beacon)
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    track('solo_start', 'Code-Route')
    expect(beacon).toHaveBeenCalledTimes(1)
    const [url, blob] = beacon.mock.calls[0]
    expect(url).toBe('/api/ev')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/plain')
    expect(JSON.parse(await blobText(blob))).toEqual({ e: 'solo_start', c: 'code-route' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('omet le contexte absent ou vide après nettoyage, et tronque à 32', async () => {
    const beacon = vi.fn(() => true)
    setBeacon(beacon)
    track('share')
    track('defi_end', '   ')
    track('exam_end', 'x'.repeat(40))
    expect(JSON.parse(await blobText(beacon.mock.calls[0][1]))).toEqual({ e: 'share' })
    expect(JSON.parse(await blobText(beacon.mock.calls[1][1]))).toEqual({ e: 'defi_end' })
    expect(JSON.parse(await blobText(beacon.mock.calls[2][1]))).toEqual({ e: 'exam_end', c: 'x'.repeat(32) })
  })

  it('ne fait rien pour un événement hors liste blanche', () => {
    const beacon = vi.fn(() => true)
    setBeacon(beacon)
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    track('pageview')
    track('')
    track(undefined)
    track('solo_start ')
    expect(beacon).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('se replie sur fetch keepalive si sendBeacon refuse ou manque', () => {
    const fetchSpy = vi.fn(() => Promise.resolve())
    vi.stubGlobal('fetch', fetchSpy)
    setBeacon(vi.fn(() => false))
    track('daily_end', 'ok')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/ev')
    expect(init).toMatchObject({ method: 'POST', keepalive: true, body: '{"e":"daily_end","c":"ok"}' })

    delete navigator.sendBeacon
    track('share')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('ne lève jamais : sendBeacon qui plante, fetch qui rejette, fetch absent', async () => {
    setBeacon(() => {
      throw new Error('beacon HS')
    })
    expect(() => track('share')).not.toThrow()

    delete navigator.sendBeacon
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('réseau'))))
    expect(() => track('share')).not.toThrow()
    await Promise.resolve()

    vi.stubGlobal('fetch', undefined)
    expect(() => track('share')).not.toThrow()
  })

  it('expose la liste blanche du contrat, sans pageview', () => {
    expect(EVENT_NAMES).toHaveLength(14)
    expect(EVENT_NAMES).toContain('solo_start')
    expect(EVENT_NAMES).toContain('error_boundary')
    expect(EVENT_NAMES).not.toContain('pageview')
  })
})
