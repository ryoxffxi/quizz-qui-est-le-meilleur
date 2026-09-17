// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LanguageProvider } from '../i18n'
import LanguageSelector from './LanguageSelector'

vi.mock('../lib/sound', () => ({ sound: { select: vi.fn() } }))

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('quizzo_lang', 'fr')
})
afterEach(cleanup)

function setup() {
  const utils = render(
    <LanguageProvider>
      <LanguageSelector />
    </LanguageProvider>,
  )
  const toggle = utils.getByRole('button', { name: 'Changer de langue' })
  return { ...utils, toggle }
}

describe('LanguageSelector', () => {
  it('bouton fermé : aria-haspopup listbox, aria-expanded false, pas de liste', () => {
    const { toggle } = setup()
    expect(toggle.getAttribute('aria-haspopup')).toBe('listbox')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('ouvre une listbox dont les li sont de présentation et les options sélectionnables', () => {
    const { toggle } = setup()
    fireEvent.click(toggle)
    const list = screen.getByRole('listbox')
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.getAttribute('aria-controls')).toBe(list.id)
    expect(list.querySelectorAll('li').length).toBe(4)
    list.querySelectorAll('li').forEach((li) => expect(li.getAttribute('role')).toBe('presentation'))
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(4)
    expect(options[0].getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(options[0])
  })

  it('les flèches déplacent le focus, Échap referme et rend le focus au bouton', () => {
    const { toggle } = setup()
    fireEvent.click(toggle)
    const list = screen.getByRole('listbox')
    const options = screen.getAllByRole('option')
    fireEvent.keyDown(list, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(options[1])
    fireEvent.keyDown(list, { key: 'End' })
    expect(document.activeElement).toBe(options[3])
    fireEvent.keyDown(list, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(options[0])
    fireEvent.keyDown(list, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(toggle)
  })

  it('choisir une option change la langue et referme le menu', () => {
    const { toggle } = setup()
    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('option', { name: /English/ }))
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem('quizzo_lang')).toBe('en')
    expect(document.activeElement).toBe(toggle)
  })

  it('un clic hors du menu le referme', () => {
    const { toggle } = setup()
    fireEvent.click(toggle)
    expect(screen.getByRole('listbox')).toBeTruthy()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
