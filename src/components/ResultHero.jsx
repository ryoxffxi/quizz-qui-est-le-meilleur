import { Trophy } from 'lucide-react'
import { useI18n } from '../i18n'

// Clé i18n de personnalité selon le score (rendue par t() côté appelant).
export function personalityKey(correct, total) {
  if (total > 0 && correct >= total) return 'personality_genius'
  if (total > 0 && correct / total > 0.5) return 'personality_good'
  return 'personality_bad'
}

// Grande carte « célébration » avec dégradé aux couleurs de la catégorie,
// trophée centré et nom de la catégorie. Le contenu (score / comparaison)
// est passé en enfants.
export default function ResultHero({ category, children }) {
  const { t } = useI18n()
  return (
    <div
      className="result-hero"
      style={{
        background: `linear-gradient(160deg, ${category.gradient[0]}, ${category.gradient[1]})`,
      }}
    >
      <div className="hero-trophy">
        <Trophy size={44} strokeWidth={2.2} />
      </div>
      <span className="hero-cat">
        {category.emoji} {t(category.labelKey)}
      </span>
      {children}
    </div>
  )
}
