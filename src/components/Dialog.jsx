import { useEffect, useRef } from 'react'

// Modale commune, bâtie sur <dialog> natif + showModal() : focus piégé par le
// navigateur, Échap -> onClose, clic sur le voile -> onClose, retour du focus
// à l'élément déclencheur à la fermeture, verrou de défilement du <body>.
// Styles : .modal (voile plein écran flouté) / .modal-card (carte) / .modal-x
// (bouton fermer, posé par l'appelant) dans src/index.css.
//
// Usage :
//   <Dialog open={open} onClose={close} labelledBy={titleId}>
//     <button type="button" className="modal-x" onClick={close} aria-label="Fermer">…</button>
//     <h2 id={titleId}>…</h2>
//   </Dialog>
// Quand `open` est faux, rien n'est rendu (les enfants perdent leur état).

// Compteur de modales ouvertes : le verrou de défilement ne saute que quand
// la dernière se ferme (deux modales imbriquées restent possibles).
let openCount = 0
function lockScroll() {
  openCount += 1
  document.body.classList.add('modal-open')
}
function unlockScroll() {
  openCount = Math.max(0, openCount - 1)
  if (openCount === 0) document.body.classList.remove('modal-open')
}

export default function Dialog({ open, onClose, labelledBy, className = '', children }) {
  const ref = useRef(null)
  const cardRef = useRef(null)
  // onClose change d'identité à chaque rendu du parent : on le lit via une
  // ref pour ne pas rouvrir/refermer la modale à chaque rendu.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const el = ref.current
    if (!open || !el) return undefined
    const opener = document.activeElement
    // Repli sans showModal (navigateur ancien, jsdom) : attribut open + Échap
    // géré à la main ; le piège de focus natif n'existe alors pas.
    const native = typeof el.showModal === 'function'
    if (native) {
      if (!el.open) el.showModal()
    } else {
      el.setAttribute('open', '')
    }
    lockScroll()
    // Focus initial sur la carte : le lecteur d'écran annonce le titre, et le
    // premier Tab tombe sur le bouton Fermer.
    const card = cardRef.current
    if (card) card.focus({ preventScroll: true })

    const close = () => {
      if (onCloseRef.current) onCloseRef.current()
    }
    // Échap : le navigateur émet `cancel` (on garde la main sur l'état React),
    // puis `close` si le navigateur force la fermeture (2e Échap sous Chrome).
    const onCancel = (e) => {
      e.preventDefault()
      close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    // Le <dialog> couvre tout l'écran : un clic dont la cible est l'élément
    // lui-même (hors carte) vaut clic sur le voile.
    const onClick = (e) => {
      if (e.target === el) close()
    }
    el.addEventListener('cancel', onCancel)
    el.addEventListener('close', close)
    el.addEventListener('click', onClick)
    if (!native) document.addEventListener('keydown', onKey)

    return () => {
      el.removeEventListener('cancel', onCancel)
      el.removeEventListener('close', close)
      el.removeEventListener('click', onClick)
      if (!native) document.removeEventListener('keydown', onKey)
      if (native) {
        if (el.open) el.close()
      } else {
        el.removeAttribute('open')
      }
      unlockScroll()
      if (opener && opener.isConnected && typeof opener.focus === 'function') {
        opener.focus({ preventScroll: true })
      }
    }
  }, [open])

  if (!open) return null

  return (
    <dialog
      ref={ref}
      className={`modal ${className}`.trim()}
      aria-labelledby={labelledBy}
      aria-modal="true"
    >
      <div ref={cardRef} className="modal-card" tabIndex={-1}>
        {children}
      </div>
    </dialog>
  )
}
