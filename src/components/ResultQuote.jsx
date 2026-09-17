import { useI18n } from '../i18n'
import { tierOf } from '../lib/game'
import { QUOTES } from '../content/quotes'

// Petite citation amusante (façon CoD Mobile), juste au-dessus du récap.
// Cinq ambiances alignées sur les paliers de personnalité (voir tierOf).
// `seed` est tiré une seule fois par le parent (dans un handler) : ce composant
// reste une fonction PURE et la citation est stable pour un résultat donné.
export default function ResultQuote({ correct, total, seed = 0 }) {
  const { lang } = useI18n()
  const tier = tierOf(correct, total)
  const list = QUOTES[tier] || []
  if (!list.length) return null
  const q = list[Math.abs(seed) % list.length]
  return <p className={`result-quote ${tier}`}>“{q[lang] || q.fr}”</p>
}
