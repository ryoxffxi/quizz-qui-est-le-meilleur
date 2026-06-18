import { useI18n } from '../i18n'
import { personalityKey } from './ResultHero'
import { QUOTES } from '../content/quotes'

// Ambiance de la citation selon le score (réutilise les tiers de personnalité).
function tierFrom(correct, total) {
  const key = personalityKey(correct, total)
  if (key === 'personality_genius') return 'genius'
  if (key === 'personality_good') return 'good'
  return 'bad'
}

// Petite citation amusante (façon CoD Mobile), juste au-dessus du récap.
// `seed` est tiré une seule fois par le parent (dans un handler) -> ce composant
// reste une fonction PURE et la citation est stable pour un résultat donné.
export default function ResultQuote({ correct, total, seed = 0 }) {
  const { lang } = useI18n()
  const tier = tierFrom(correct, total)
  const list = QUOTES[tier] || []
  if (!list.length) return null
  const q = list[seed % list.length]
  return <p className={`result-quote ${tier}`}>“{q[lang] || q.fr}”</p>
}
