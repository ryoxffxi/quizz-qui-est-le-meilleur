// @vitest-environment jsdom
// Onglet Panneaux : chips, galerie triée, fiche dans la modale commune
// <Dialog>, pièges, réglage des noms, quiz par famille, entrée flashcards.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LanguageProvider } from '../i18n'
import PanneauxRevision from './PanneauxRevision'
import { FAMILIES, SIGNS } from '../content/panneaux/signs'

vi.mock('../lib/sound', () => ({
  sound: { select: vi.fn(), correct: vi.fn(), wrong: vi.fn(), win: vi.fn() },
}))

const NAMES_KEY = 'quizz_panneaux_names'

function mount(props = {}) {
  const onStartQuiz = vi.fn()
  const onFlashcards = vi.fn()
  const utils = render(
    <LanguageProvider>
      <PanneauxRevision onStartQuiz={onStartQuiz} onFlashcards={onFlashcards} {...props} />
    </LanguageProvider>,
  )
  return { ...utils, onStartQuiz, onFlashcards }
}

const dialog = () => document.querySelector('dialog.modal-sign')
const chip = (label) =>
  [...document.querySelectorAll('.fam-chip')].find((b) => b.textContent.includes(label))
const card = (code) =>
  screen.getByText(code, { selector: '.sign-card .sign-code' }).closest('button')

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('quizzo_lang', 'fr') // jsdom se déclare en-US
})
afterEach(() => {
  cleanup()
  document.body.classList.remove('modal-open')
})

describe('PanneauxRevision : galerie', () => {
  it('chips en boutons aria-pressed, première famille active', () => {
    mount()
    const pressed = screen.getAllByRole('button', { pressed: true })
    expect(pressed).toHaveLength(1)
    expect(pressed[0].textContent).toContain(FAMILIES[0].label)
    expect(screen.queryByRole('tab')).toBeNull()
  })

  it('la galerie suit le tri de SIGNS et change avec la famille', () => {
    mount()
    const codesOf = () =>
      [...document.querySelectorAll('.sign-card .sign-code')].map((el) => el.textContent)
    expect(codesOf()).toEqual(
      SIGNS.filter((s) => s.family === FAMILIES[0].id).map((s) => s.code),
    )
    fireEvent.click(chip('Priorité'))
    expect(codesOf()).toEqual(SIGNS.filter((s) => s.family === 'priorite').map((s) => s.code))
    expect(chip('Priorité').getAttribute('aria-pressed')).toBe('true')
  })

  it('interrupteur « Afficher les noms » persistant (quizz_panneaux_names)', () => {
    mount()
    expect(document.querySelector('.sign-card-name')).toBeNull()
    const toggle = screen.getByRole('switch')
    fireEvent.click(toggle)
    expect(localStorage.getItem(NAMES_KEY)).toBe('1')
    expect(document.querySelectorAll('.sign-card-name').length).toBeGreaterThan(0)
    fireEvent.click(toggle)
    expect(localStorage.getItem(NAMES_KEY)).toBeNull()
    expect(document.querySelector('.sign-card-name')).toBeNull()
  })

  it('le réglage des noms est relu au montage', () => {
    localStorage.setItem(NAMES_KEY, '1')
    mount()
    expect(screen.getByRole('switch').checked).toBe(true)
    expect(document.querySelectorAll('.sign-card-name').length).toBeGreaterThan(0)
  })

  it('chaque carte porte une description lisible (sr-only) sans afficher le nom', () => {
    mount()
    const first = document.querySelector('.sign-card')
    expect(first.querySelector('.sr-only').textContent.length).toBeGreaterThan(5)
    expect(first.querySelector('svg').closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('« Quiz {famille} (n) » -> onStartQuiz solo avec imageFamily', () => {
    const { onStartQuiz } = mount()
    fireEvent.click(chip('Interdiction'))
    fireEvent.click(screen.getByRole('button', { name: /^Quiz Interdiction \(\d+\)$/ }))
    expect(onStartQuiz).toHaveBeenCalledWith({
      mode: 'solo',
      difficulty: 'facile',
      imageFamily: 'interdiction',
    })
  })

  it('entrée Flashcards : compte des cartes dues, puis onFlashcards()', () => {
    const { onFlashcards } = mount()
    const entry = screen.getByRole('button', { name: new RegExp(`Flashcards \\(${SIGNS.length} à revoir\\)`) })
    fireEvent.click(entry)
    expect(onFlashcards).toHaveBeenCalledTimes(1)
  })
})

describe('PanneauxRevision : fiche <Dialog>', () => {
  it('ouvre la fiche dans la modale commune, nommée par le titre, focus sur la carte, défilement verrouillé', () => {
    mount()
    fireEvent.click(chip('Priorité'))
    fireEvent.click(card('AB1'))
    const d = dialog()
    expect(d.hasAttribute('open')).toBe(true)
    expect(d.className).toBe('modal modal-sign')
    const title = screen.getByRole('heading', { level: 3 })
    expect(title.textContent).toBe('Intersection à priorité à droite')
    expect(d.getAttribute('aria-labelledby')).toBe(title.id)
    // Contrat <Dialog> : focus initial sur la carte (annonce du titre), le
    // premier Tab tombe sur « Fermer » (bouton icône, libellé `close`).
    expect(document.activeElement).toBe(d.querySelector('.modal-card'))
    const close = screen.getByRole('button', { name: 'Fermer' })
    expect(close.className).toBe('modal-x')
    expect(close.querySelector('svg')).not.toBeNull()
    expect(close.textContent).toBe('')
    expect(document.body.classList.contains('modal-open')).toBe(true)
  })

  it('affiche les pièges (jumeau + tip) et le lien vers la fiche statique', () => {
    mount()
    fireEvent.click(chip('Priorité'))
    fireEvent.click(card('AB1'))
    expect(screen.getByText('À ne pas confondre')).toBeTruthy()
    expect(screen.getByText('AB1 ou AB2 ?')).toBeTruthy()
    expect(screen.getByText(/vous cédez à ceux qui arrivent de votre droite/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Fiche complète' }).getAttribute('href')).toBe(
      '/panneaux/ab1',
    )
  })

  it('un jumeau d’une autre famille ouvre sa fiche et suit sa famille', () => {
    mount()
    fireEvent.click(card('A21')) // danger ; jumeau B9b = interdiction
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la fiche B9b' }))
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('Accès interdit aux cycles')
    expect(chip('Interdiction').getAttribute('aria-pressed')).toBe('true')
    expect(chip('Danger').getAttribute('aria-pressed')).toBe('false')
  })

  it('flèches ← / → : panneau suivant et précédent dans la famille (boucle)', () => {
    mount()
    fireEvent.click(chip('Priorité'))
    fireEvent.click(card('AB1'))
    fireEvent.keyDown(dialog(), { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(
      'Intersection où vous avez la priorité',
    )
    fireEvent.keyDown(dialog(), { key: 'ArrowLeft' })
    fireEvent.keyDown(dialog(), { key: 'ArrowLeft' })
    expect(screen.getByText('8 / 8')).toBeTruthy()
  })

  it('Fermer : démonte la modale, rend le défilement et le focus à la carte de la galerie', () => {
    mount()
    fireEvent.click(chip('Priorité'))
    const trigger = card('AB4')
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(dialog()).toBeNull()
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(document.body.classList.contains('modal-open')).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('Échap (événement cancel du dialog) et fermeture native (close) referment aussi', () => {
    mount()
    fireEvent.click(card('A14'))
    expect(dialog().hasAttribute('open')).toBe(true)
    fireEvent(dialog(), new Event('cancel', { cancelable: true }))
    expect(dialog()).toBeNull()
    fireEvent.click(card('A14'))
    expect(dialog()).not.toBeNull()
    fireEvent(dialog(), new Event('close'))
    expect(dialog()).toBeNull()
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
  })

  it('un clic sur le voile referme, un clic dans la carte non', () => {
    mount()
    fireEvent.click(card('A14'))
    fireEvent.click(screen.getByRole('heading', { level: 3 }))
    expect(dialog()).not.toBeNull()
    fireEvent.click(dialog())
    expect(dialog()).toBeNull()
  })
})
