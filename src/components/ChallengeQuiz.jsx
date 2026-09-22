import { useEffect, useMemo, useRef, useState } from 'react'
import { getCategory, getLocalizedQuestions, getQuestions } from '../content'
import {
  CHALLENGE_DEFAULT_ROUNDS,
  CHALLENGE_QUESTION_COUNT,
  DIFFICULTIES,
  maxRoundsForBank,
  scoreForAnswer,
  simulateFriendRun,
} from '../lib/game'
import { buildChallengeDeck } from '../lib/quiz'
import { optionsGridClass } from '../lib/optionsLayout'
import { buildChallengeUrl } from '../lib/challengeLink'
import { emojiGrid, shareOrCopy } from '../lib/share'
import { recordAnswer, recordRound } from '../lib/stats'
import { recordFail, recordSuccess } from '../lib/errors'
import { recordDuel } from '../lib/duels'
import { track } from '../lib/analytics'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import { CatIcon, IconStar } from './icons'
import ErrorRecap from './ErrorRecap'
import SignImage from './SignImage'
import ResultHero from './ResultHero'
import ResultShare from './ResultShare'
import ResultAd from './ResultAd'
import '../styles/defi.css'

const TICK_MS = 100 // libellé des secondes + détection de la fin du chrono
const NEXT_DELAY_MS = 650 // court suspense après verrouillage (pas de correction)
const TICK_FROM_S = 3 // tic sonore à chaque seconde entière sous ce seuil
const STATUS_MS = 2000 // durée d'affichage de « Copié »
const LETTERS = ['A', 'B', 'C', 'D']

const sum = (arr) => arr.reduce((a, b) => a + b, 0)

// config = { categoryId, difficulty, seed, rounds, mode: 'host'|'join'|'simulate',
//            myName, opponent: null | { name, roundScores: number[] },
//            rival?: string (adversaire d'une revanche, mémorisé dans l'historique) }
// onRematch({ categoryId, difficulty, rounds, opponent }) : facultatif ; quand
// il est fourni, l'invité peut lancer une revanche (configuration pré-remplie).
//
// Réponse en deux temps : le premier tap choisit (modifiable), le second tap
// sur la même option verrouille. La fin du chrono ou le masquage de l'onglet
// verrouillent le choix courant ; le score se calcule sur le temps du 1er tap.
export default function ChallengeQuiz({ config, onExit, onRematch }) {
  const { t, lang } = useI18n()
  const { categoryId, difficulty, seed, mode, myName, opponent } = config
  const category = getCategory(categoryId)
  const settings = DIFFICULTIES[difficulty] || DIFFICULTIES.facile
  const totalTime = settings.timePerQuestion
  const catName = category ? t(category.labelKey) : categoryId

  const bankSize = getQuestions(categoryId, difficulty).length
  const roundCount = Math.max(
    1,
    Math.min(config.rounds || CHALLENGE_DEFAULT_ROUNDS, maxRoundsForBank(bankSize)),
  )

  // Paquet DÉTERMINISTE de roundCount×5 questions distinctes, déjà localisées
  // (même graine + même langue ⇒ identique des deux côtés), en manches de 5.
  const rounds = useMemo(() => {
    const pool = getLocalizedQuestions(categoryId, difficulty, lang)
    const deck = buildChallengeDeck(pool, seed, roundCount * CHALLENGE_QUESTION_COUNT)
    const out = []
    for (let i = 0; i < deck.length; i += CHALLENGE_QUESTION_COUNT) {
      out.push(deck.slice(i, i + CHALLENGE_QUESTION_COUNT))
    }
    return out
  }, [categoryId, difficulty, seed, roundCount, lang])

  const maxRounds = rounds.length

  // Scores de l'adversaire par manche : lien (join), simulés, ou aucun (host).
  const opponentName = opponent
    ? opponent.name
    : mode === 'simulate'
      ? t('default_friend')
      : null
  const opponentRoundScores = useMemo(() => {
    if (opponent) return opponent.roundScores || []
    if (mode === 'simulate') return rounds.map((r) => simulateFriendRun(r, difficulty).score)
    return null
  }, [opponent, mode, rounds, difficulty])
  const hasOpponent = opponentRoundScores != null

  const [roundIndex, setRoundIndex] = useState(0)
  const [index, setIndex] = useState(0)
  const [remaining, setRemaining] = useState(totalTime)
  const [selected, setSelected] = useState(null)
  const [locked, setLocked] = useState(false)
  const [score, setScore] = useState(0) // points de la manche (barre du haut)
  // Fin de manche : { scores: [par manche], mistakes, grid } ; null en jeu.
  const [result, setResult] = useState(null)

  // Accumulateurs lus/écrits uniquement dans les gestionnaires et effets.
  const roundRef = useRef({ score: 0, correct: 0, mistakes: [] })
  const roundScoresRef = useRef([])
  const resultsRef = useRef([]) // bon/mauvais par question, toutes manches
  const answeredRef = useRef(false)
  const selectedRef = useRef(null)
  const chosenAtRef = useRef(null) // temps restant au 1er tap (base du score)
  const remainingRef = useRef(totalTime)
  const intervalRef = useRef(null)
  const nextTimerRef = useRef(null)
  const lockRef = useRef(null) // verrouillage courant (chrono, onglet masqué)

  const roundQuestions = rounds[roundIndex] || []
  const question = roundQuestions[index]
  const finished = result != null

  function finishChallenge(scores) {
    const myCumul = sum(scores)
    let outcome = 'solo'
    if (hasOpponent) {
      const oppCumul = sum(opponentRoundScores.slice(0, maxRounds))
      outcome = myCumul === oppCumul ? 'tie' : myCumul > oppCumul ? 'win' : 'lose'
      if (outcome === 'win') sound.win()
      else if (outcome === 'lose') sound.lose()
    }
    track('defi_end', mode === 'simulate' ? 'simulate' : outcome)
    if (mode === 'join' && Number.isInteger(seed)) {
      recordDuel({
        seed,
        cat: categoryId,
        diff: difficulty,
        opponent: opponentName,
        myScores: scores,
        theirScores: opponentRoundScores.slice(0, maxRounds),
        status: 'played',
      })
    }
  }

  function finishRound() {
    const round = roundRef.current
    const scores = [...roundScoresRef.current, round.score]
    roundScoresRef.current = scores
    recordRound({
      cat: categoryId,
      diff: difficulty,
      mode: 'defi',
      score: round.correct,
      total: roundQuestions.length,
    })
    if (roundIndex + 1 >= maxRounds) finishChallenge(scores)
    setResult({ scores, mistakes: round.mistakes, grid: emojiGrid(resultsRef.current) })
  }

  // Remet la question courante à zéro (états + accumulateurs).
  function resetQuestion() {
    answeredRef.current = false
    selectedRef.current = null
    chosenAtRef.current = null
    remainingRef.current = totalTime
    setSelected(null)
    setLocked(false)
    setRemaining(totalTime)
  }

  function goNext() {
    nextTimerRef.current = null
    if (index + 1 >= roundQuestions.length) {
      finishRound()
      return
    }
    resetQuestion()
    setIndex((i) => i + 1)
  }

  // Verrouille la réponse (2e tap, fin du chrono, onglet masqué) : une seule fois.
  function lockAnswer(choice, timeLeft) {
    if (answeredRef.current || !question) return
    answeredRef.current = true
    clearInterval(intervalRef.current)

    const isCorrect = choice != null && choice === question.correct
    recordAnswer(categoryId, difficulty, isCorrect)
    if (isCorrect) recordSuccess(categoryId, question.id)
    else recordFail(categoryId, question.id)
    resultsRef.current.push(isCorrect)

    const round = roundRef.current
    if (isCorrect) {
      round.correct += 1
      round.score += scoreForAnswer({
        correct: true,
        timeLeft,
        totalTime,
        basePoints: settings.basePoints,
      })
    } else {
      round.mistakes.push({ question, chosen: choice })
    }
    navigator.vibrate?.(15)

    setScore(round.score)
    setSelected(choice)
    setLocked(true)
    nextTimerRef.current = setTimeout(goNext, NEXT_DELAY_MS)
  }

  // Verrouillage forcé (chrono écoulé, onglet masqué) sur le choix courant.
  function lockCurrent(reason) {
    const choice = selectedRef.current
    if (reason === 'timeout' && choice == null) sound.wrong()
    lockAnswer(choice, chosenAtRef.current ?? 0)
  }

  // Le chrono et visibilitychange appellent toujours la version la plus récente.
  useEffect(() => {
    lockRef.current = lockCurrent
  })

  // Chrono : 100 ms suffisent pour le libellé des secondes et le verrouillage ;
  // la barre est animée en CSS (animation `drain`, chantier design).
  useEffect(() => {
    if (finished || !question) return undefined
    const start = performance.now()
    let lastSec = Math.ceil(totalTime)
    const id = setInterval(() => {
      const left = Math.max(0, totalTime - (performance.now() - start) / 1000)
      remainingRef.current = left
      setRemaining(left)
      const sec = Math.ceil(left)
      if (sec !== lastSec) {
        lastSec = sec
        if (sec > 0 && sec <= TICK_FROM_S) sound.tick()
      }
      if (left <= 0) lockRef.current?.('timeout')
    }, TICK_MS)
    intervalRef.current = id
    return () => clearInterval(id)
  }, [roundIndex, index, finished, question, totalTime])

  // Onglet masqué (appel, autre app) : on verrouille, pas de triche au chrono.
  useEffect(() => {
    if (finished || !question) return undefined
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') lockRef.current?.('hidden')
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [finished, question])

  // Le passage à la question suivante ne doit pas survivre au démontage.
  useEffect(() => () => clearTimeout(nextTimerRef.current), [])

  function choose(i) {
    if (locked || answeredRef.current) return
    sound.select()
    if (selectedRef.current === i) {
      lockAnswer(i, chosenAtRef.current ?? remainingRef.current)
      return
    }
    selectedRef.current = i
    chosenAtRef.current = remainingRef.current
    setSelected(i)
  }

  function continueRound() {
    sound.select()
    roundRef.current = { score: 0, correct: 0, mistakes: [] }
    resetQuestion()
    setScore(0)
    setRoundIndex((r) => r + 1)
    setIndex(0)
    setResult(null)
  }

  if (!category) {
    return <Notice title={t('defi_no_question')} onExit={onExit} home={t('home')} />
  }

  if (finished) {
    const isLast = roundIndex + 1 >= maxRounds
    const myRoundScores = result.scores
    const myRound = myRoundScores[roundIndex] ?? 0
    const myCumul = sum(myRoundScores)
    const oppRound = hasOpponent ? (opponentRoundScores[roundIndex] ?? 0) : null
    const oppCumul = hasOpponent ? sum(opponentRoundScores.slice(0, roundIndex + 1)) : null

    let title
    if (hasOpponent) {
      const lead = myCumul === oppCumul ? 'tie' : myCumul > oppCumul ? 'me' : 'opp'
      if (isLast) {
        title =
          lead === 'tie'
            ? t('result_tie_final')
            : lead === 'me'
              ? t('result_win_final')
              : t('result_lose_final', { opp: opponentName })
      } else {
        title =
          lead === 'tie'
            ? t('result_tie_lead')
            : lead === 'me'
              ? t('result_lead')
              : t('result_behind', { opp: opponentName })
      }
    } else {
      title = isLast ? t('result_challenge_done') : t('result_round_done')
    }

    const max = Math.max(myCumul, oppCumul ?? 0, 1)
    const maxPoints = maxRounds * CHALLENGE_QUESTION_COUNT * settings.basePoints

    // Paquet à transmettre : mêmes questions (graine), mes scores comme repère.
    // L'hôte (ou le joueur du test) le partage ; l'invité le transfère.
    const packet = {
      p: myName,
      c: categoryId,
      d: difficulty,
      s: seed,
      n: maxRounds,
      l: lang,
      r: [...myRoundScores],
    }
    const inviteUrl = buildChallengeUrl(packet)
    const inviteText = t(maxRounds === 1 ? 'defi_share_text_one' : 'defi_share_text', {
      host: myName,
      cat: catName,
      n: maxRounds,
      total: myCumul,
      url: inviteUrl,
    })
    const onShared =
      mode === 'join'
        ? undefined
        : () =>
            recordDuel({
              seed,
              cat: categoryId,
              diff: difficulty,
              opponent: config.rival || null,
              myScores: myRoundScores,
              status: 'sent',
            })

    return (
      <div className="quiz">
        <ResultHero category={category}>
          <div className="hero-title">{title}</div>

          {hasOpponent ? (
            <>
              <div className="versus">
                {[
                  { name: myName, cumul: myCumul, round: myRound, me: true },
                  { name: opponentName, cumul: oppCumul, round: oppRound, me: false },
                ].map((p) => (
                  <div
                    key={p.me ? 'me' : 'opp'}
                    className={`vs-player ${
                      myCumul !== oppCumul &&
                      ((p.me && myCumul > oppCumul) || (!p.me && oppCumul > myCumul))
                        ? 'winner'
                        : ''
                    }`}
                  >
                    <span className="vs-name">{p.name}</span>
                    <span className="vs-score">{p.cumul}</span>
                    <div className="vs-bar-track">
                      <div
                        className="vs-bar-fill"
                        style={{ height: `${(p.cumul / max) * 100}%` }}
                      />
                    </div>
                    <span className="vs-detail">{t('round_gain_short', { g: p.round })}</span>
                  </div>
                ))}
              </div>
              <span className="hero-round">
                {t('round_cumulative', { r: roundIndex + 1, mr: maxRounds })}
              </span>
            </>
          ) : (
            <>
              <div className="hero-score">
                {myCumul}
                <span className="hero-score-total">{t('points_suffix')}</span>
              </div>
              <span className="hero-round">
                {t('round_gain', { r: roundIndex + 1, mr: maxRounds, g: myRound })}
              </span>
            </>
          )}
          {isLast && result.grid && <pre className="defi-grid">{result.grid}</pre>}
        </ResultHero>

        <ErrorRecap mistakes={result.mistakes} />

        {/* Invité : renvoie son score à l'hôte (carte duel, partage natif). */}
        {isLast && mode === 'join' && (
          <ResultShare
            title={t('defi_send_back_title', { host: opponentName })}
            sub={t('defi_send_back_sub')}
            resultData={{
              c: categoryId,
              d: difficulty,
              l: lang,
              n: maxRounds,
              s: seed,
              p1: myName,
              r1: [...myRoundScores],
              p2: opponentName,
              r2: opponentRoundScores.slice(0, maxRounds),
            }}
          />
        )}

        {/* Tout le monde : transmettre le paquet (hôte, test seul, invité). */}
        {isLast && (
          <ShareLink
            url={inviteUrl}
            text={inviteText}
            title={mode === 'join' ? t('defi_forward_title') : t('share_play_title')}
            sub={mode === 'join' ? t('defi_forward_sub') : t('share_play_sub')}
            onShared={onShared}
          />
        )}

        {/* Hôte et test seul : carte image de son propre score (pas de duel
            contre un robot). */}
        {isLast && mode !== 'join' && (
          <ResultShare
            resultData={{
              solo: 1,
              c: categoryId,
              d: difficulty,
              l: lang,
              sc: myCumul,
              tot: maxPoints,
              mode: 'defi',
              grid: result.grid,
            }}
          />
        )}

        {isLast && <ResultAd />}

        <div className="result-actions">
          {!isLast && (
            <button type="button" className="btn btn-primary" onClick={continueRound}>
              {t('continue_challenge', { n: CHALLENGE_QUESTION_COUNT })}
            </button>
          )}
          {isLast && mode === 'join' && typeof onRematch === 'function' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                sound.select()
                onRematch({
                  categoryId,
                  difficulty,
                  rounds: maxRounds,
                  opponent: opponentName,
                })
              }}
            >
              {t('defi_rematch_vs', { name: opponentName })}
            </button>
          )}
          <button
            type="button"
            className={`btn ${isLast && mode !== 'join' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={onExit}
          >
            {t('home')}
          </button>
        </div>
      </div>
    )
  }

  // Banque vide ou paquet impossible : on ne tente pas d'afficher une question.
  if (!question) {
    return <Notice title={t('defi_no_question')} onExit={onExit} home={t('home')} />
  }

  const urgent = remaining <= totalTime * 0.3
  const withImages =
    Array.isArray(question.optionImages) &&
    question.optionImages.length === question.options.length
  const hint = locked
    ? t('answer_saved')
    : selected != null
      ? t('defi_hint_confirm')
      : t('defi_hint_choose')

  return (
    <div className="quiz">
      <div className="quiz-topbar">
        <button type="button" className="btn-ghost" onClick={onExit}>
          {t('quit')}
        </button>
        <span className="quiz-progress">
          {t('challenge_topbar', {
            r: roundIndex + 1,
            mr: maxRounds,
            i: index + 1,
            n: roundQuestions.length,
          })}
        </span>
        <span className="quiz-score">
          <IconStar size={14} className="quiz-score-icon" />
          {score}
        </span>
      </div>

      <div className="timer-track">
        <div
          key={`${roundIndex}-${index}`}
          className={`timer-fill ${urgent ? 'urgent' : ''}`}
          style={{
            animationDuration: `${totalTime}s`,
            animationPlayState: locked ? 'paused' : 'running',
          }}
        />
      </div>
      <div className={`timer-value ${urgent ? 'urgent' : ''}`}>{remaining.toFixed(1)}s</div>

      <div className="quiz-body">
        <span className="quiz-cat" style={{ '--cat': category.gradient[0] }}>
          <CatIcon id={category.id} size={14} strokeWidth={2.2} />
          {catName} · {myName}
        </span>
        {question.image && <SignImage id={question.image} className="quiz-sign" />}
        <h2 className="quiz-question">{question.question}</h2>

        <div className={`options ${withImages ? 'with-images' : ''} ${optionsGridClass(question)}`}>
          {question.options.map((opt, i) => {
            const isChosen = selected === i
            return (
              <button
                key={i}
                type="button"
                className={`option ${isChosen ? 'chosen' : ''} ${isChosen && locked ? 'locked' : ''}`}
                // aria-disabled plutôt que disabled : un bouton désactivé perd le
                // focus clavier (il retombe sur la page) et la question suivante
                // arriverait sans focus ; choose() ignore déjà les taps verrouillés.
                aria-disabled={locked || undefined}
                aria-pressed={isChosen}
                aria-label={withImages ? opt : undefined}
                onClick={() => choose(i)}
              >
                <span className="option-letter">{LETTERS[i]}</span>
                {withImages ? (
                  <>
                    <SignImage id={question.optionImages[i]} className="option-sign" alt="" />
                    <span className="option-text sr-only">{opt}</span>
                  </>
                ) : (
                  <span className="option-text">{opt}</span>
                )}
              </button>
            )
          })}
        </div>

        <p className={locked ? 'suspense' : 'step-hint'}>{hint}</p>
      </div>
    </div>
  )
}

// Écran d'information avec retour à l'accueil (catégorie inconnue, banque vide).
function Notice({ title, home, onExit }) {
  return (
    <div className="quiz">
      <div className="defi-notice">
        <h2 className="defi-notice-title">{title}</h2>
        <button type="button" className="btn btn-primary" onClick={onExit}>
          {home}
        </button>
      </div>
    </div>
  )
}

// Bloc « partage du paquet » : feuille native ou copie du texte pré-rédigé,
// lien lisible en repli. « Copié » s'efface après 2 s.
function ShareLink({ url, text, title, sub, onShared }) {
  const { t } = useI18n()
  const [status, setStatus] = useState('') // '' | 'shared' | 'copied' | 'failed'

  useEffect(() => {
    if (!status) return undefined
    const id = setTimeout(() => setStatus(''), STATUS_MS)
    return () => clearTimeout(id)
  }, [status])

  async function share() {
    sound.select()
    const outcome = await shareOrCopy({ url, text, title: t('app_title') })
    if (outcome !== 'failed') {
      track('share', 'defi')
      if (onShared) onShared()
    }
    setStatus(outcome)
  }

  return (
    <div className="share">
      <p className="share-title">{title}</p>
      <p className="share-sub">{sub}</p>
      <button type="button" className="btn btn-primary" onClick={share}>
        {status === 'copied' ? t('copied') : t('defi_share_button')}
      </button>
      <input
        className="share-input"
        readOnly
        value={url}
        aria-label={title}
        onFocus={(e) => e.target.select()}
      />
      {status === 'failed' && <p className="share-status bad">{t('defi_share_failed')}</p>}
    </div>
  )
}
