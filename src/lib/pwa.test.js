// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

vi.mock('./analytics', () => ({ track: vi.fn() }))

// La langue hors React (translate) est figée à l'import du module i18n :
// on la pose AVANT les imports.
vi.hoisted(() => {
  localStorage.setItem('quizzo_lang', 'fr')
})

import { track } from './analytics'
import {
  initPwa,
  onPreloadError,
  resetPwaForTests,
  useInstallPrompt,
  useUpdateAvailable,
} from './pwa'

// Faux BeforeInstallPromptEvent : prompt() + userChoice.
function fakeInstallEvent(outcome) {
  const e = new Event('beforeinstallprompt', { cancelable: true })
  e.prompt = vi.fn()
  e.userChoice = Promise.resolve({ outcome })
  return e
}

beforeEach(() => {
  resetPwaForTests()
  document.body.innerHTML = ''
})
afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('useInstallPrompt', () => {
  it('null avant beforeinstallprompt, fonction après, null une fois utilisée', async () => {
    initPwa()
    const { result } = renderHook(() => useInstallPrompt())
    expect(result.current).toBeNull()

    const e = fakeInstallEvent('accepted')
    act(() => {
      window.dispatchEvent(e)
    })
    expect(e.defaultPrevented).toBe(true)
    expect(typeof result.current).toBe('function')

    let outcome
    await act(async () => {
      outcome = await result.current()
    })
    expect(outcome).toBe('accepted')
    expect(e.prompt).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('pwa_install', 'accepted')
    expect(result.current).toBeNull()
  })

  it('refus : pwa_install dismissed', async () => {
    initPwa()
    const { result } = renderHook(() => useInstallPrompt())
    act(() => {
      window.dispatchEvent(fakeInstallEvent('dismissed'))
    })
    await act(async () => {
      await result.current()
    })
    expect(track).toHaveBeenCalledWith('pwa_install', 'dismissed')
  })

  it('appinstalled retire l’invitation', () => {
    initPwa()
    const { result } = renderHook(() => useInstallPrompt())
    act(() => {
      window.dispatchEvent(fakeInstallEvent('accepted'))
    })
    expect(result.current).not.toBeNull()
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(result.current).toBeNull()
  })

  it('initPwa est idempotent (StrictMode, double appel)', () => {
    initPwa()
    initPwa()
    const { result } = renderHook(() => useInstallPrompt())
    const e = fakeInstallEvent('accepted')
    act(() => {
      window.dispatchEvent(e)
    })
    expect(typeof result.current).toBe('function')
  })
})

describe('useUpdateAvailable', () => {
  it('false sans service worker (vitest : pas de build)', () => {
    initPwa()
    const { result } = renderHook(() => useUpdateAvailable())
    expect(result.current).toBe(false)
  })
})

describe('onPreloadError', () => {
  it('en ligne : affiche le toast de rechargement (une seule fois)', () => {
    vi.useFakeTimers()
    onPreloadError()
    onPreloadError()
    const toasts = document.querySelectorAll('.app-toast')
    expect(toasts.length).toBe(1)
    expect(toasts[0].textContent).toBe('Nouvelle version disponible, rechargement…')
    expect(toasts[0].getAttribute('role')).toBe('status')
  })

  it('hors ligne : ne fait rien (l’écran affiche son propre message)', () => {
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    onPreloadError()
    expect(document.querySelector('.app-toast')).toBeNull()
    spy.mockRestore()
  })
})
