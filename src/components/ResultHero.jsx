import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { personalityKey, tierOf } from '../lib/game'
import { CatIcon } from './icons'
import '../styles/solo.css'

// Compatibilité : les autres écrans (Défi, Quotidien, carte de partage)
// importent la clé de personnalité depuis ce composant. La logique vit dans
// src/lib/game.js (pure, testée) ; on la ré-exporte ici sans la dupliquer.
// eslint-disable-next-line react-refresh/only-export-components
export { personalityKey, tierOf }

const COUNT_MS = 700
const CONFETTI_COUNT = 20

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

// requestAnimationFrame avec repli (environnements sans rAF).
function raf(cb) {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(cb)
  return setTimeout(() => cb(performance.now()), 16)
}
function cancelRaf(id) {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id)
  else clearTimeout(id)
}

// Compteur 0 → score en 700 ms (easeOutCubic) et anneau qui se remplit
// (transition CSS sur --p, voir solo.css). En « animations réduites », tout
// est affiché d'emblée.
function useScoreReveal(score, percent, active) {
  const [state, setState] = useState(() =>
    !active || prefersReducedMotion() ? { shown: score, ring: percent } : { shown: 0, ring: 0 },
  )
  useEffect(() => {
    if (!active || prefersReducedMotion()) return
    let id = 0
    let t0 = null
    const step = (now) => {
      if (t0 === null) t0 = now
      const k = Math.min(1, (now - t0) / COUNT_MS)
      const eased = 1 - Math.pow(1 - k, 3)
      setState({ shown: Math.round(score * eased), ring: percent })
      if (k < 1) id = raf(step)
    }
    id = raf(step)
    return () => cancelRaf(id)
  }, [score, percent, active])
  return state
}

// Confettis CSS légers (sans-faute) : positions et teintes dérivées de l'index,
// donc rendu pur et stable.
function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
        <i
          key={i}
          style={{
            '--x': `${(i * 37) % 100}%`,
            '--h': (i * 47) % 360,
            '--d': `${(i % 5) * 60}ms`,
            '--r': `${(i * 83) % 360}deg`,
            '--s': (i % 3) + 1,
          }}
        />
      ))}
    </div>
  )
}

// Carte de résultat réutilisable (Solo, Examen, Quotidien, Défi).
//   - score/total : anneau rempli au pourcentage + compteur animé 0 → score ;
//   - label : ligne principale (personnalité, verdict d'examen...) ;
//   - sublabel : ligne discrète (« Lot 3 · 10/10 », date...) ;
//   - verdict (+ tone 'good' | 'bad' | 'warn') : pastille au-dessus du score ;
//   - percent (ancienne API, sans score/total) : anneau animé au pourcentage,
//     `children` rendus AU CENTRE de l'anneau (le score, mis en forme par
//     l'appelant), `below` en dessous ;
//   - sans score ni percent : `children` seuls (Défi, contenu libre).
// Confettis quand l'anneau est plein (100 %).
export default function ResultHero({
  category,
  score,
  total,
  percent,
  label,
  sublabel,
  verdict,
  tone = 'good',
  children,
  below,
}) {
  const { t } = useI18n()
  const hasScore = score != null && total > 0
  const hasRing = hasScore || percent != null
  let pct = 0
  if (hasScore) pct = Math.round((score / total) * 100)
  else if (hasRing) pct = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)))
  const reveal = useScoreReveal(hasScore ? score : 0, pct, hasRing)
  const tier = hasRing ? tierOf(pct, 100) : null

  return (
    <div
      className={`result-hero${tier ? ` tier-${tier}` : ''}`}
      style={{ '--cat': category?.gradient?.[0] }}
    >
      {hasRing && pct === 100 && <Confetti />}
      {category && (
        <span className="hero-cat">
          <CatIcon id={category.id} size={14} strokeWidth={2.2} />
          {t(category.labelKey)}
        </span>
      )}
      {verdict && <span className={`hero-verdict ${tone}`}>{verdict}</span>}
      {hasRing ? (
        <div className="score-ring" style={{ '--p': reveal.ring }}>
          {hasScore ? (
            <div className="hero-score" aria-label={`${score}/${total}`}>
              <span aria-hidden="true">{reveal.shown}</span>
              <span className="hero-score-total" aria-hidden="true">
                /{total}
              </span>
            </div>
          ) : (
            children
          )}
        </div>
      ) : (
        children
      )}
      {label && <div className="hero-personality">{label}</div>}
      {sublabel && <span className="hero-round">{sublabel}</span>}
      {hasScore && children}
      {below}
    </div>
  )
}
