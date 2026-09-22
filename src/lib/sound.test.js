// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Faux AudioContext : enregistre les nœuds créés et les fréquences jouées.
function fakeAudio(state = 'suspended') {
  const log = { freqs: [], compressors: 0, resumes: 0, oscillators: 0 }
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() })
  class FakeCtx {
    constructor() {
      this.state = state
      this.currentTime = 0
      this.destination = { name: 'destination' }
    }
    resume() {
      log.resumes += 1
      this.state = 'running'
      return Promise.resolve()
    }
    createDynamicsCompressor() {
      log.compressors += 1
      return {
        threshold: param(),
        knee: param(),
        ratio: param(),
        attack: param(),
        release: param(),
        connect: vi.fn(),
      }
    }
    createGain() {
      const node = { gain: param(), connect: vi.fn(() => node) }
      return node
    }
    createOscillator() {
      log.oscillators += 1
      const freq = param()
      freq.setValueAtTime = vi.fn((v) => log.freqs.push(v))
      const node = { type: '', frequency: freq, connect: vi.fn(() => node), start: vi.fn(), stop: vi.fn() }
      return node
    }
  }
  return { FakeCtx, log }
}

async function freshSound() {
  vi.resetModules()
  return (await import('./sound')).sound
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  delete window.AudioContext
})

describe('sound', () => {
  it('lit le mode silencieux persisté au chargement et le persiste', async () => {
    localStorage.setItem('quizz_muted', '1')
    const sound = await freshSound()
    expect(sound.isMuted()).toBe(true)
    sound.setMuted(false)
    expect(localStorage.getItem('quizz_muted')).toBeNull()
    sound.setMuted(true)
    expect(localStorage.getItem('quizz_muted')).toBe('1')
    expect((await freshSound()).isMuted()).toBe(true)
  })

  it('ne crée rien sans AudioContext et reste silencieux', async () => {
    const sound = await freshSound()
    expect(() => sound.select()).not.toThrow()
    expect(() => sound.lose()).not.toThrow()
  })

  it('relance le contexte quand il n’est pas en marche (suspended, interrupted)', async () => {
    const { FakeCtx, log } = fakeAudio('interrupted')
    window.AudioContext = FakeCtx
    const sound = await freshSound()
    sound.unlock()
    expect(log.resumes).toBe(1)
    sound.select() // maintenant 'running' : pas de nouvel appel
    expect(log.resumes).toBe(1)
  })

  it('branche un seul compresseur sur le bus maître', async () => {
    const { FakeCtx, log } = fakeAudio()
    window.AudioContext = FakeCtx
    const sound = await freshSound()
    sound.correct()
    sound.wrong()
    sound.win()
    expect(log.compressors).toBe(1)
    expect(log.oscillators).toBe(2 + 1 + 4)
  })

  it('lose() descend, tick() est court, select() varie légèrement', async () => {
    const { FakeCtx, log } = fakeAudio()
    window.AudioContext = FakeCtx
    const sound = await freshSound()
    sound.lose()
    const notes = [...log.freqs]
    expect(notes).toHaveLength(4)
    for (let i = 1; i < notes.length; i++) expect(notes[i]).toBeLessThan(notes[i - 1])

    log.freqs.length = 0
    sound.tick()
    expect(log.freqs).toEqual([420])

    log.freqs.length = 0
    for (let i = 0; i < 20; i++) sound.select()
    for (const f of log.freqs) {
      expect(f).toBeGreaterThanOrEqual(520 * 0.96)
      expect(f).toBeLessThanOrEqual(520 * 1.04)
    }
    expect(new Set(log.freqs).size).toBeGreaterThan(1)
  })

  it('en mode silencieux, aucun oscillateur n’est créé', async () => {
    const { FakeCtx, log } = fakeAudio()
    window.AudioContext = FakeCtx
    const sound = await freshSound()
    sound.setMuted(true)
    sound.select()
    sound.correct()
    sound.lose()
    expect(log.oscillators).toBe(0)
  })
})
