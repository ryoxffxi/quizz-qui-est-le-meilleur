import { getSign } from '../content/panneaux/signs'
import '../styles/panneaux.css'

// Affiche le SVG d'un panneau (par id).
//
// Accessibilité : le SVG lui-même est décoratif ; la description passe par un
// texte masqué (.sr-only). `alt` :
//   - chaîne : lue telle quelle (galerie : le nom ; flashcards : description) ;
//   - non fourni : description NEUTRE du panneau (details.js, forme + couleur +
//     picto) si elle existe. Elle ne donne pas le nom, donc elle convient au
//     quiz, où le nom est la réponse ;
//   - '' ou false : purement décoratif (aria-hidden).
// `size` : largeur en px (ou toute valeur CSS) pour les vignettes.
export default function SignImage({ id, className = '', size, alt }) {
  const sign = getSign(id)
  if (!sign) return null
  const text = alt === undefined ? sign.alt : alt
  const style = size ? { width: size } : undefined
  return (
    <span className={`sign-image ${className}`} style={style}>
      <span
        className="sign-image-inner"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: sign.svg }}
      />
      {text ? <span className="sr-only">{text}</span> : null}
    </span>
  )
}
