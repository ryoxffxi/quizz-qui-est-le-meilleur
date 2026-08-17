import { useI18n } from '../i18n'
import { CatIcon } from './icons'

// Clé i18n de personnalité selon le score (rendue par t() côté appelant).
export function personalityKey(correct, total) {
  if (total > 0 && correct >= total) return 'personality_genius'
  if (total > 0 && correct / total > 0.5) return 'personality_good'
  return 'personality_bad'
}

// Carte de résultat v2 : surface neutre + pastille de catégorie teintée.
// `percent` (0-100) affiche l'anneau de score rempli par l'accent : le contenu
// (score) est alors rendu AU CENTRE de l'anneau, le reste en dessous.
export default function ResultHero({ category, percent, children, below }) {
  const { t } = useI18n()
  return (
    <div className="result-hero" style={{ '--cat': category.gradient[0] }}>
      <span className="hero-cat">
        <CatIcon id={category.id} size={14} strokeWidth={2.2} />
        {t(category.labelKey)}
      </span>
      {percent != null ? (
        <>
          <div className="score-ring" style={{ '--p': percent }}>
            {children}
          </div>
          {below}
        </>
      ) : (
        children
      )}
    </div>
  )
}
