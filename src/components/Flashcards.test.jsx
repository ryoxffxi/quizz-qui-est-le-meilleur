// @vitest-environment jsdom
// Flashcards : session de cartes dues, retournement, notation (clic et
// clavier), bilan, état « tout est à jour », événement flash_session.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LanguageProvider } from '../i18n'
import Flashcards from './Flashcards'
import { SIGNS } from '../content/panneaux/signs'
import { FLASH_KEY, FLASH_SESSION_SIZE } from '../lib/flashcards'
import { track } from '../lib/analytics'

vi.mock('../lib/analytics', () => ({ track: vi.fn() }))
vi.mock('../lib/sound', () => ({
  sound: { select: vi.fn(), correct: vi.fn(), wrong: vi.fn(), win: vi.fn() },
}))

const DAY = 86400000

// Toutes les cartes acquises et non dues, sauf `dueIds` (jamais vues).
function seed(dueIds) {
  const state = {}
  for (const s of SIGNS) {
    if (dueIds.includes(s.id)) continue
    state[s.id] = { box: 3, due: Date.now() + 10 * DAY, last: Date.now() }
  }
  localStorage.setItem(FLASH_KEY, JSON.stringify(state))
}

function mount() {
  const onExit = vi.fn()
  render(
    <LanguageProvider>
      <Flashcards onExit={onExit} />
    </LanguageProvider>,
  )
  return { onExit }
}

const heading = () => screen.getByRole('heading', { level: 3 })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('quizzo_lang', 'fr')
  vi.mocked(track).mockClear()
})
afterEach(cleanup)

describe('Flashcards', () => {
  it('sans historique : session plafonnée à 20 cartes, recto sans nom', () => {
    mount()
    expect(screen.getByText(`Carte 1 / ${FLASH_SESSION_SIZE}`)).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(screen.getByRole('button', { name: 'Retourner la carte' })).toBeTruthy()
  })

  it('retourne la carte au clic, note, passe à la suivante', () => {
    seed(['ab4', 'b1'])
    mount()
    expect(screen.getByText('Carte 1 / 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retourner la carte' }))
    expect(['Stop', 'Sens interdit']).toContain(heading().textContent)
    expect(screen.getByText('Nouvelle carte')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Je savais$/ }))
    expect(screen.getByText('Carte 2 / 2')).toBeTruthy()
    expect(document.querySelector('.flash-card.flipped')).toBeNull()
  })

  it('clavier : Espace retourne, ← « je ne savais pas », puis bilan et événement', () => {
    seed(['ab4', 'b1'])
    mount()
    // Les flèches n'ont pas d'effet tant que la carte n'est pas retournée.
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('Carte 1 / 2')).toBeTruthy()
    fireEvent.keyDown(window, { key: ' ' })
    expect(document.querySelector('.flash-card.flipped')).not.toBeNull()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('Carte 2 / 2')).toBeTruthy()
    fireEvent.keyDown(window, { key: ' ' })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(screen.getByText('Session terminée')).toBeTruthy()
    expect(screen.getByText('Tu savais 1 cartes sur 2.')).toBeTruthy()
    expect(track).toHaveBeenCalledWith('flash_session', '1_2')
    // La carte ratée est due demain : rien à refaire tout de suite.
    expect(screen.queryByRole('button', { name: /^Encore/ })).toBeNull()
    const saved = JSON.parse(localStorage.getItem(FLASH_KEY))
    const boxes = [saved.ab4.box, saved.b1.box].sort()
    expect(boxes).toEqual([1, 2])
  })

  it('« Encore » apparaît quand d’autres cartes restent dues', () => {
    seed(SIGNS.slice(0, FLASH_SESSION_SIZE + 3).map((s) => s.id))
    mount()
    for (let i = 0; i < FLASH_SESSION_SIZE; i++) {
      fireEvent.keyDown(window, { key: ' ' })
      fireEvent.keyDown(window, { key: 'ArrowRight' })
    }
    expect(screen.getByText('Session terminée')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Encore (3 à revoir)' }))
    expect(screen.getByText('Carte 1 / 3')).toBeTruthy()
  })

  it('rien à revoir : écran « Tout est à jour » et retour à l’accueil', () => {
    seed([])
    const { onExit } = mount()
    expect(screen.getByText('Tout est à jour')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Accueil' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('le bouton Quitter appelle onExit', () => {
    const { onExit } = mount()
    fireEvent.click(screen.getByRole('button', { name: /Quitter/ }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
