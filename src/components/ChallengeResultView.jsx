import { getCategory } from '../content'
import { DIFFICULTIES } from '../lib/game'
import { useI18n } from '../i18n'
import ResultHero, { personalityKey } from './ResultHero'

// Page de conversion ouverte depuis un lien de résultat partagé :
// le score, une bulle expliquant le concept, et deux appels à l'action
// (défier un ami / jouer comme un nouvel utilisateur).
// result Solo : { c, d, solo, sc, tot } — Défi : { c, d, n, p1, r1, p2, r2 }
export default function ChallengeResultView({ result, onPlay, onChallenge }) {
  const { t } = useI18n()
  const category = getCategory(result.c)

  if (!category || !DIFFICULTIES[result.d]) {
    return (
      <div className="quiz">
        <div className="result-card">
          <h2 className="result-title">{t('result_invalid')}</h2>
          <button className="btn btn-primary" onClick={onPlay}>
            {t('home')}
          </button>
        </div>
      </div>
    )
  }

  // Bloc « score » selon le type de résultat partagé.
  let scoreBlock
  if (result.solo) {
    scoreBlock = (
      <>
        <div className="hero-score">
          {result.sc}
          <span className="hero-score-total">/{result.tot}</span>
        </div>
        <div className="hero-personality">
          {t(personalityKey(result.sc, result.tot))}
        </div>
        <span className="hero-round">
          {t('result_solo_label', { diff: t(`diff_${result.d}`) })}
        </span>
      </>
    )
  } else {
    const s1 = result.r1.reduce((a, b) => a + b, 0)
    const s2 = result.r2.reduce((a, b) => a + b, 0)
    const winner = s1 === s2 ? 'tie' : s1 > s2 ? 'p1' : 'p2'
    const max = Math.max(s1, s2, 1)
    const title =
      winner === 'tie'
        ? t('result_duel_tie')
        : t('result_duel_win', { name: winner === 'p1' ? result.p1 : result.p2 })
    const players = [
      { name: result.p1, score: s1, win: winner === 'p1' },
      { name: result.p2, score: s2, win: winner === 'p2' },
    ]
    scoreBlock = (
      <>
        <div className="hero-title">{title}</div>
        <div className="versus">
          {players.map((p, i) => (
            <div key={i} className={`vs-player ${p.win ? 'winner' : ''}`}>
              <span className="vs-name">{p.name}</span>
              <span className="vs-score">{p.score}</span>
              <div className="vs-bar-track">
                <div
                  className="vs-bar-fill"
                  style={{ height: `${(p.score / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <span className="hero-round">{t(`diff_${result.d}`)}</span>
      </>
    )
  }

  return (
    <div className="quiz">
      <p className="landing-intro">{t('landing_intro')}</p>

      <ResultHero category={category}>{scoreBlock}</ResultHero>

      {/* Bulle expliquant le concept */}
      <div className="concept-bubble">
        <p className="concept-title">{t('concept_title')}</p>
        <p className="concept-text">{t('concept_text')}</p>
      </div>

      {/* Appels à l'action : défier un ami / jouer comme nouvel utilisateur */}
      <div className="result-actions">
        <button type="button" className="btn btn-primary" onClick={onChallenge}>
          {t('landing_challenge')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onPlay}>
          {t('landing_play')}
        </button>
      </div>
    </div>
  )
}
