import { getSign } from '../content/panneaux/signs'

// Affiche le SVG d'un panneau (par id). Décoratif pour les lecteurs d'écran :
// dans le quiz, un libellé révélerait la réponse ; en révision, le nom est
// affiché à côté.
export default function SignImage({ id, className = '' }) {
  const sign = getSign(id)
  if (!sign) return null
  return (
    <span
      className={`sign-image ${className}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: sign.svg }}
    />
  )
}
