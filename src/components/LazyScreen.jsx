import { createElement } from 'react'
import { getScreen } from '../lib/screens'

// Rend l'écran paresseux `name` (src/lib/screens.js) avec les autres props.
// createElement plutôt que <Comp /> : getScreen renvoie une référence STABLE
// (cache par nom, donc pas de remontage entre rendus) mais volontairement
// recréée après un échec de chargement (resetScreen, bouton Réessayer), ce que
// la règle react-hooks/static-components ne peut pas vérifier.
export default function LazyScreen({ name, ...props }) {
  return createElement(getScreen(name), props)
}
