// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LanguageProvider } from '../i18n'
import { LEGAL } from '../content/legal'
import LegalModal from './LegalModal'

// Date attendue, calculée comme le composant : la date ISO du contenu légal
// (seule ou dans une phrase) rendue en toutes lettres dans la langue.
function expectedDate(doc, lang) {
  const iso = String(LEGAL[doc].fr.updated).match(/\d{4}-\d{2}-\d{2}/)[0]
  return new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(`${iso}T12:00:00`))
}

beforeEach(() => {
  localStorage.clear()
})
afterEach(cleanup)

function mount(lang) {
  localStorage.setItem('quizzo_lang', lang)
  render(
    <LanguageProvider>
      <LegalModal />
    </LanguageProvider>,
  )
}

function openLegal(detail) {
  act(() => {
    window.dispatchEvent(new CustomEvent('quizz:open-legal', { detail }))
  })
}

describe('LegalModal', () => {
  it('reste fermée sans événement', () => {
    mount('fr')
    expect(document.querySelector('dialog')).toBeNull()
  })

  it('ouvre les conditions en français avec la date reformatée en toutes lettres', () => {
    mount('fr')
    openLegal('terms')
    const dialog = document.querySelector('dialog.modal')
    expect(dialog).not.toBeNull()
    expect(dialog.className).toContain('modal-legal')
    const title = document.getElementById(dialog.getAttribute('aria-labelledby'))
    expect(title.tagName).toBe('H2')
    const date = expectedDate('terms', 'fr')
    expect(date).toMatch(/^\d{1,2} \S+ \d{4}$/)
    expect(screen.getByText(`Dernière mise à jour : ${date}`)).toBeTruthy()
    expect(screen.queryByText(/\d{4}-\d{2}-\d{2}/)).toBeNull()
  })

  it('formate la date dans la langue de l’interface (anglais)', () => {
    mount('en')
    openLegal('privacy')
    expect(screen.getByText(`Last updated: ${expectedDate('privacy', 'en')}`)).toBeTruthy()
  })

  it('le bouton Fermer et Échap referment la modale', () => {
    mount('fr')
    openLegal('privacy')
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(document.querySelector('dialog')).toBeNull()
    openLegal('privacy')
    expect(document.querySelector('dialog')).not.toBeNull()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.querySelector('dialog')).toBeNull()
  })
})
