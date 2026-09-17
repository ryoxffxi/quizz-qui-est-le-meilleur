// @vitest-environment jsdom
// Carte image (1080×1920) et bloc de partage : libellé du mode, grille,
// QR code du lien, détail des manches sur deux colonnes au-delà de 5, et un
// seul bouton « Partager » avec ses replis.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LanguageProvider } from '../i18n'
import { getCategory } from '../content'
import ShareCard from './ShareCard'
import ResultShare from './ResultShare'
import { track } from '../lib/analytics'

vi.mock('../lib/sound', () => ({ sound: { select: vi.fn() } }))
vi.mock('../lib/analytics', () => ({ track: vi.fn() }))
// Capture factice : pas de canvas dans jsdom.
vi.mock('html-to-image', () => ({
  getFontEmbedCSS: vi.fn().mockResolvedValue(''),
  toBlob: vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
}))

const category = getCategory('code-route')
const solo = { solo: 1, c: 'code-route', d: 'facile', l: 'fr', sc: 12450, tot: 15000, mode: 'defi', grid: '🟩🟥🟩' }
const duel8 = {
  c: 'code-route',
  d: 'expert',
  l: 'fr',
  n: 8,
  p1: 'Sam',
  r1: [1, 2, 3, 4, 5, 6, 7, 8],
  p2: 'Alex',
  r2: [8, 7, 6, 5, 4, 3, 2, 2],
  s: 7,
}

const patched = []
function patch(obj, prop, value) {
  const desc = Object.getOwnPropertyDescriptor(obj, prop)
  patched.push(() => {
    if (desc) Object.defineProperty(obj, prop, desc)
    else delete obj[prop]
  })
  Object.defineProperty(obj, prop, { value, configurable: true, writable: true })
}

const wrap = (ui) => render(<LanguageProvider>{ui}</LanguageProvider>)

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('quizzo_lang', 'fr')
  vi.clearAllMocks()
})
afterEach(() => {
  cleanup()
  while (patched.length) patched.pop()()
})

describe('ShareCard', () => {
  it('carte « points du défi » : libellé du mode, points, grille, QR du lien', () => {
    const { container } = wrap(<ShareCard resultData={solo} category={category} />)
    expect(screen.getByText('DÉFI ENTRE POTES')).toBeTruthy()
    expect(screen.getByText('12450')).toBeTruthy()
    expect(screen.getByText('12450 / 15000 pts')).toBeTruthy()
    expect(screen.getByText('🟩🟥🟩')).toBeTruthy()
    expect(screen.getByText('Scanne pour jouer')).toBeTruthy()
    // QR : un <svg> avec un <path> (modules sombres) sur fond blanc.
    const qr = [...container.querySelectorAll('svg')].find((s) => s.querySelector('path'))
    expect(qr).toBeTruthy()
    expect(qr.getAttribute('viewBox')).toMatch(/^-4 -4 \d+ \d+$/)
  })

  it('carte solo classique : score sur total et taux de réussite', () => {
    wrap(<ShareCard resultData={{ solo: 1, c: 'code-route', d: 'facile', sc: 8, tot: 10, mode: 'quotidien' }} category={category} />)
    expect(screen.getByText('QUIZ DU JOUR')).toBeTruthy()
    expect(screen.getByText('/10')).toBeTruthy()
    expect(screen.getByText('80% de réussite')).toBeTruthy()
  })

  it('carte duel 8 manches : détail sur deux colonnes, gagnant couronné', () => {
    const { container } = wrap(<ShareCard resultData={duel8} category={category} />)
    expect(screen.getByText('⚔️ DÉFI ENTRE POTES')).toBeTruthy()
    expect(screen.getByText('DÉTAIL · 8 MANCHES')).toBeTruthy()
    expect(screen.getByText('Manche 8')).toBeTruthy()
    expect(screen.getByText('👑')).toBeTruthy() // Alex gagne 37 à 36
    const grid = [...container.querySelectorAll('div')].find((d) => d.style.gridTemplateColumns === '1fr 1fr')
    expect(grid).toBeTruthy()
    expect(grid.children).toHaveLength(8)
  })

  it('carte duel 3 manches : une seule colonne', () => {
    const { container } = wrap(
      <ShareCard resultData={{ ...duel8, n: 3, r1: [1, 2, 3], r2: [3, 2, 1] }} category={category} />,
    )
    expect([...container.querySelectorAll('div')].some((d) => d.style.gridTemplateColumns === '1fr 1fr')).toBe(false)
    expect(screen.getByText('DÉTAIL · 3 MANCHES')).toBeTruthy()
  })
})

describe('ResultShare', () => {
  it('un seul bouton « Partager », miniature de la carte, titre et sous-titre personnalisés', () => {
    const { container } = wrap(<ResultShare resultData={solo} title="Renvoie ton score à Alex" sub="Sous-titre" />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Partager' })).toBeTruthy()
    expect(screen.getByText('Renvoie ton score à Alex')).toBeTruthy()
    expect(screen.getByText('Sous-titre')).toBeTruthy()
    expect(container.querySelector('.sharecard-thumb .sharecard-scale')).toBeTruthy()
  })

  it('ordinateur : texte + lien copiés, image téléchargée, événement share', async () => {
    patch(navigator, 'maxTouchPoints', 0)
    const writeText = vi.fn().mockResolvedValue()
    patch(navigator, 'clipboard', { writeText })
    patch(URL, 'createObjectURL', vi.fn().mockReturnValue('blob:x'))
    patch(URL, 'revokeObjectURL', vi.fn())
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    wrap(<ResultShare resultData={solo} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Partager' }))
      await Promise.resolve()
    })
    expect(await screen.findByText('Texte copié, image téléchargée ✓')).toBeTruthy()
    const text = writeText.mock.calls[0][0]
    expect(text).toContain('12450 pts en Code de la route')
    expect(text).toContain('🟩🟥🟩')
    expect(text).toContain('#resultat=')
    expect(click).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('share', 'defi')
    click.mockRestore()
  })

  it('mobile : feuille native avec le fichier PNG nommé quizz-<cat>-<score>.png', async () => {
    patch(navigator, 'maxTouchPoints', 5)
    const share = vi.fn().mockResolvedValue()
    patch(navigator, 'share', share)
    patch(navigator, 'canShare', vi.fn().mockReturnValue(true))
    wrap(<ResultShare resultData={duel8} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Partager' }))
      await Promise.resolve()
    })
    await vi.waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    const data = share.mock.calls[0][0]
    expect(data.files[0].name).toBe('quizz-code-route-36.png')
    expect(data.text).toContain('Sam 36 pts vs Alex 37 pts')
    expect(track).toHaveBeenCalledWith('share', 'duel')
  })

  it('catégorie inconnue : rien à partager', () => {
    const { container } = wrap(<ResultShare resultData={{ ...solo, c: 'inconnue' }} />)
    expect(container.innerHTML).toBe('')
  })
})
