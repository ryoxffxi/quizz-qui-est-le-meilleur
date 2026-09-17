// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import Dialog from './Dialog'

afterEach(() => {
  cleanup()
  delete HTMLDialogElement.prototype.showModal
  delete HTMLDialogElement.prototype.close
  document.body.innerHTML = ''
})

function renderDialog(props = {}) {
  const onClose = vi.fn()
  const utils = render(
    <Dialog open onClose={onClose} labelledBy="titre" {...props}>
      <button type="button" className="modal-x">
        Fermer
      </button>
      <h2 id="titre">Titre</h2>
    </Dialog>,
  )
  const dialog = utils.container.querySelector('dialog')
  return { ...utils, onClose, dialog }
}

describe('Dialog', () => {
  it('ne rend rien quand open est faux', () => {
    const { container } = render(
      <Dialog open={false} onClose={() => {}}>
        <p>caché</p>
      </Dialog>,
    )
    expect(container.querySelector('dialog')).toBeNull()
    expect(document.body.classList.contains('modal-open')).toBe(false)
  })

  it('ouvre un <dialog> nommé par le titre, verrouille le défilement et focalise la carte', () => {
    const { dialog } = renderDialog()
    expect(dialog).not.toBeNull()
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(dialog.getAttribute('aria-labelledby')).toBe('titre')
    expect(dialog.className).toBe('modal')
    expect(document.body.classList.contains('modal-open')).toBe(true)
    expect(document.activeElement).toBe(dialog.querySelector('.modal-card'))
  })

  it('appelle showModal() quand le navigateur le propose et ferme sur `cancel` (Échap natif)', () => {
    HTMLDialogElement.prototype.showModal = vi.fn(function show() {
      this.setAttribute('open', '')
    })
    HTMLDialogElement.prototype.close = vi.fn(function close() {
      this.removeAttribute('open')
    })
    const { dialog, onClose } = renderDialog()
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1)
    const cancel = new Event('cancel', { cancelable: true })
    act(() => {
      dialog.dispatchEvent(cancel)
    })
    expect(cancel.defaultPrevented).toBe(true)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('sans showModal, Échap sur le document appelle onClose', () => {
    const { onClose } = renderDialog()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('un clic sur le voile ferme, un clic dans la carte non', () => {
    const { dialog, onClose } = renderDialog()
    fireEvent.click(dialog.querySelector('h2'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('à la fermeture, libère le défilement et rend le focus au déclencheur', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    expect(document.activeElement).toBe(opener)
    const { unmount } = renderDialog()
    expect(document.activeElement).not.toBe(opener)
    unmount()
    expect(document.body.classList.contains('modal-open')).toBe(false)
    expect(document.activeElement).toBe(opener)
  })

  it('accepte une classe supplémentaire', () => {
    const { dialog } = renderDialog({ className: 'modal-legal' })
    expect(dialog.className).toBe('modal modal-legal')
  })
})
