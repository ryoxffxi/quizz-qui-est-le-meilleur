// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LanguageProvider } from '../i18n'
import Paywall from './Paywall'

vi.mock('../lib/sound', () => ({ sound: { select: vi.fn() } }))

// Paiements « ouverts » pour exercer le verrou ; premium piloté par le test.
const premiumState = { value: false }
vi.mock('../lib/usePremium', () => ({ usePremium: () => premiumState.value }))
vi.mock('../lib/premium', () => ({
  PREMIUM_LIVE: true,
  startCheckout: vi.fn(),
  openPortal: vi.fn(),
}))

import { startCheckout, openPortal } from '../lib/premium'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('quizzo_lang', 'fr')
  premiumState.value = false
  vi.clearAllMocks()
})
afterEach(cleanup)

function open() {
  render(
    <LanguageProvider>
      <Paywall />
    </LanguageProvider>,
  )
  act(() => {
    window.dispatchEvent(new CustomEvent('quizz:open-paywall'))
  })
}

describe('Paywall', () => {
  it('reste fermé tant que l’événement quizz:open-paywall n’est pas reçu', () => {
    render(
      <LanguageProvider>
        <Paywall />
      </LanguageProvider>,
    )
    expect(document.querySelector('dialog')).toBeNull()
  })

  it('s’ouvre dans un <dialog> nommé par son titre, avec un bouton Fermer', () => {
    open()
    const dialog = document.querySelector('dialog.modal')
    expect(dialog).not.toBeNull()
    const title = document.getElementById(dialog.getAttribute('aria-labelledby'))
    expect(title.textContent).toContain('Quizz Premium')
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(document.querySelector('dialog')).toBeNull()
  })

  it('un double-clic sur « Acheter à vie » ne lance qu’une seule session Stripe', async () => {
    let resolve
    startCheckout.mockImplementation(() => new Promise((r) => (resolve = r)))
    open()
    const buy = screen.getByRole('button', { name: 'Acheter à vie' })
    fireEvent.click(buy)
    fireEvent.click(buy)
    fireEvent.click(screen.getByRole('button', { name: 'S’abonner' }))
    expect(startCheckout).toHaveBeenCalledTimes(1)
    expect(startCheckout).toHaveBeenCalledWith('lifetime')
    // Échec (backend absent) : verrou levé, message « bientôt ».
    await act(async () => {
      resolve(false)
    })
    expect(screen.getByText(/bientôt disponible/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Acheter à vie' }))
    expect(startCheckout).toHaveBeenCalledTimes(2)
  })

  it('premium : propose « Gérer mon abonnement » via openPortal, et signale un portail indisponible', async () => {
    premiumState.value = true
    openPortal.mockResolvedValue(false)
    open()
    expect(screen.queryByRole('button', { name: 'Acheter à vie' })).toBeNull()
    const manage = screen.getByRole('button', { name: 'Gérer mon abonnement' })
    await act(async () => {
      fireEvent.click(manage)
    })
    expect(openPortal).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/Portail indisponible/)).toBeTruthy()
  })
})
