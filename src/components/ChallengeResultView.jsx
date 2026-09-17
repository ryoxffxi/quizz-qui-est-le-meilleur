import { useEffect, useRef, useState } from 'react'
import { getCategory } from '../content'
import { DIFFICULTIES, personalityKey } from '../lib/game'
import { getPseudo, recordDuel } from '../lib/duels'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import ResultHero from './ResultHero'
import '../styles/defi.css'

const sum = (arr) => arr.reduce((a, b) => a + b, 0)

// Page de conversion ouverte depuis un lien de résultat partagé : le score,
// une bulle expliquant le concept, et les appels à l'action.
//
// result Solo : { solo: 1, c, d, l?, sc, tot, mode?, grid? }
// result Duel : { c, d, l?, n?, s?, p1, r1, p2, r2 }
//   p1 = le joueur qui a partagé (l'invité qui renvoie son score), p2 = l'hôte.
//
// Props :
//   onPlay()                     : jouer (accueil)
//   onChallenge({ opponent?, rounds? }) : ouvrir la configuration d'un défi
//                                  (pré-remplie pour une revanche)
//   onJoin({ invite })           : facultatif ; rejouer les MÊMES questions
//                                  contre le gagnant (lien avec graine)
export default function ChallengeResultView({ result, onPlay, onChallenge, onJoin }) {
  const { t } = useI18n()
  const category = getCategory(result.c)
  const [pseudo] = useState(getPseudo)

  // Duel : qui regarde ? Si le pseudo mémorisé est celui de l'hôte (p2), c'est
  // la réponse à SON défi ; s'il est p1, il relit son propre résultat.
  const isDuel = !result.solo && Array.isArray(result.r1) && Array.isArray(result.r2)
  const me = !isDuel || !pseudo ? null : pseudo === result.p2 ? 'p2' : pseudo === result.p1 ? 'p1' : null
  const rival = me === 'p2' ? result.p1 : me === 'p1' ? result.p2 : null
  const rounds = isDuel ? result.n || Math.max(result.r1.length, result.r2.length) : 0

  // L'hôte ouvre la réponse de son pote : le duel passe « répondu » dans
  // l'historique local (une fois par montage).
  const recordedRef = useRef(false)
  useEffect(() => {
    if (recordedRef.current || me !== 'p2' || !Number.isInteger(result.s)) return
    recordedRef.current = true
    recordDuel({
      seed: result.s,
      cat: result.c,
      diff: result.d,
      opponent: result.p1 || null,
      myScores: result.r2,
      theirScores: result.r1,
      status: 'answered',
    })
  }, [me, result])

  if (!category || !DIFFICULTIES[result.d]) {
    return (
      <div className="quiz">
        <div className="defi-notice">
          <h2 className="defi-notice-title">{t('result_invalid')}</h2>
          <button type="button" className="btn btn-primary" onClick={onPlay}>
            {t('home')}
          </button>
        </div>
      </div>
    )
  }

  const diffLabel = t(`diff_${result.d}`)

  // Bloc « score » selon le type de résultat partagé.
  let scoreBlock
  let invite = null
  let winnerName = null
  if (!isDuel) {
    const label = result.mode ? `${t(`card_mode_${result.mode}`)} · ${diffLabel}` : t('result_solo_label', { diff: diffLabel })
    scoreBlock = (
      <>
        <div className="hero-score">
          {result.sc}
          <span className="hero-score-total">/{result.tot}</span>
        </div>
        <div className="hero-personality">{t(personalityKey(result.sc, result.tot))}</div>
        <span className="hero-round">{label}</span>
        {result.grid && <pre className="defi-grid">{result.grid}</pre>}
      </>
    )
  } else {
    const s1 = sum(result.r1)
    const s2 = sum(result.r2)
    const winner = s1 === s2 ? 'tie' : s1 > s2 ? 'p1' : 'p2'
    const max = Math.max(s1, s2, 1)
    winnerName = winner === 'p2' ? result.p2 : result.p1
    const title =
      me === 'p2'
        ? t('defi_answered_title', { name: result.p1 })
        : winner === 'tie'
          ? t('result_duel_tie')
          : t('result_duel_win', { name: winnerName })
    const players = [
      { name: result.p1, score: s1, win: winner === 'p1' },
      { name: result.p2, score: s2, win: winner === 'p2' },
    ]
    // Rejouer les mêmes questions : le lien porte la graine, on affronte le
    // meilleur des deux (ses scores servent de repère manche par manche).
    if (Number.isInteger(result.s) && typeof onJoin === 'function') {
      invite = {
        p: winnerName,
        c: result.c,
        d: result.d,
        s: result.s,
        n: rounds,
        r: winner === 'p2' ? [...result.r2] : [...result.r1],
      }
      if (result.l) invite.l = result.l
    }
    scoreBlock = (
      <>
        <div className="hero-title">{title}</div>
        <div className="versus">
          {players.map((p, i) => (
            <div key={i} className={`vs-player ${p.win ? 'winner' : ''}`}>
              <span className="vs-name">{p.name}</span>
              <span className="vs-score">{p.score}</span>
              <div className="vs-bar-track">
                <div className="vs-bar-fill" style={{ height: `${(p.score / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <span className="hero-round">
          {rounds > 0
            ? `${t(rounds === 1 ? 'rounds_count_one' : 'rounds_count', { n: rounds })} · ${diffLabel}`
            : diffLabel}
        </span>
      </>
    )
  }

  function rematch() {
    sound.select()
    onChallenge({ opponent: rival, rounds })
  }

  function join() {
    sound.select()
    onJoin({ invite })
  }

  function challenge() {
    sound.select()
    onChallenge({})
  }

  return (
    <div className="quiz">
      <p className="landing-intro">
        {me === 'p2' ? t('defi_answered_sub') : t('landing_intro')}
      </p>

      <ResultHero category={category}>{scoreBlock}</ResultHero>

      {/* Bulle expliquant le concept (inutile à l'hôte, qui le connaît). */}
      {me !== 'p2' && (
        <div className="concept-bubble">
          <p className="concept-title">{t('concept_title')}</p>
          <p className="concept-text">{t('concept_text')}</p>
        </div>
      )}

      {/* Appels à l'action, du plus engageant au plus neutre :
          revanche (adversaire connu) > mêmes questions contre le gagnant >
          défier un pote > jouer. */}
      <div className="result-actions">
        {rival ? (
          <button type="button" className="btn btn-primary" onClick={rematch}>
            {t('defi_rematch_vs', { name: rival })}
          </button>
        ) : invite ? (
          <button type="button" className="btn btn-primary" onClick={join}>
            {t('defi_beat_winner', { name: winnerName })}
          </button>
        ) : null}
        {!rival && (
          <button
            type="button"
            className={`btn ${invite ? 'btn-secondary' : 'btn-primary'}`}
            onClick={challenge}
          >
            {t('landing_challenge')}
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={onPlay}>
          {t('landing_play')}
        </button>
      </div>
    </div>
  )
}
