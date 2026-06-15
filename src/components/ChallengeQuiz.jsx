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
import { buildChallengeUrl } from '../lib/challengeLink'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import ErrorRecap from './ErrorRecap'
import ResultHero from './ResultHero'
import ResultShare from './ResultShare'

const TICK_MS = 50

// config = { categoryId, difficulty, seed, rounds, mode: 'host'|'join'|'simulate',
//            myName, opponent: null | { name, roundScores: number[] } }
export default function ChallengeQuiz({ config, onExit }) {
  const { t, lang } = useI18n()
  const { categoryId, difficulty, seed, mode, myName, opponent } = config
  const category = getCategory(categoryId)
  const catName = t(category.labelKey)
  const settings = DIFFICULTIES[difficulty]
  const totalTime = settings.timePerQuestion

  const bankSize = getQuestions(categoryId, difficulty).length
  const roundCount = Math.max(
    1,
    Math.min(
      config.rounds || CHALLENGE_DEFAULT_ROUNDS,
      maxRoundsForBank(bankSize),
    ),
  )

  // Paquet DÉTERMINISTE de roundCount×5 questions distinctes, déjà localisées
  // (même graine + même langue ⇒ identique des deux côtés), en manches de 5.
  const rounds = useMemo(() => {
    const pool = getLocalizedQuestions(categoryId, difficulty, lang)
    const deck = buildChallengeDeck(
      pool,
      seed,
      roundCount * CHALLENGE_QUESTION_COUNT,
    )
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, rounds, difficulty])
  const hasOpponent = opponentRoundScores != null

  const [roundIndex, setRoundIndex] = useState(0)
  const [index, setIndex] = useState(0)
  const [remaining, setRemaining] = useState(totalTime)
  const [selected, setSelected] = useState(null)
  const [locked, setLocked] = useState(false)
  const [finished, setFinished] = useState(false)
  const [myRoundScores, setMyRoundScores] = useState([])

  const scoreRef = useRef(0)
  const correctRef = useRef(0)
  const mistakesRef = useRef([])
  const answeredRef = useRef(false)
  const intervalRef = useRef(null)

  const roundQuestions = rounds[roundIndex] || []
  const question = roundQuestions[index]

  function goNext() {
    if (index + 1 >= roundQuestions.length) {
      if (roundIndex + 1 >= maxRounds) sound.win()
      setMyRoundScores((s) => [...s, scoreRef.current])
      setFinished(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  function lockAnswer(choice, timeLeft) {
    if (answeredRef.current) return
    answeredRef.current = true
    clearInterval(intervalRef.current)

    const isCorrect = choice != null && choice === question.correct
    if (isCorrect) {
      correctRef.current += 1
      scoreRef.current += scoreForAnswer({
        correct: true,
        timeLeft,
        totalTime,
        basePoints: settings.basePoints,
      })
    } else {
      mistakesRef.current.push({ question, chosen: choice })
    }

    setSelected(choice)
    setLocked(true)
    setTimeout(goNext, 650) // pas de correction : court suspense
  }

  useEffect(() => {
    if (finished) return
    answeredRef.current = false
    setSelected(null)
    setLocked(false)
    setRemaining(totalTime)

    const start = performance.now()
    intervalRef.current = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000
      const left = Math.max(0, totalTime - elapsed)
      setRemaining(left)
      if (left <= 0) {
        sound.wrong()
        lockAnswer(null, 0)
      }
    }, TICK_MS)

    return () => clearInterval(intervalRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex, index])

  function choose(i) {
    if (locked) return
    sound.select()
    lockAnswer(i, remaining)
  }

  function continueRound() {
    sound.select()
    scoreRef.current = 0
    correctRef.current = 0
    mistakesRef.current = []
    answeredRef.current = false
    setRoundIndex((r) => r + 1)
    setIndex(0)
    setFinished(false)
  }

  if (finished) {
    const isLast = roundIndex + 1 >= maxRounds
    const bankExhausted = maxRounds * CHALLENGE_QUESTION_COUNT >= bankSize
    const myRound = myRoundScores[roundIndex] ?? scoreRef.current
    const myCumul = myRoundScores.reduce((a, b) => a + b, 0)
    const oppRound = hasOpponent ? opponentRoundScores[roundIndex] ?? 0 : null
    const oppCumul = hasOpponent
      ? opponentRoundScores.slice(0, roundIndex + 1).reduce((a, b) => a + b, 0)
      : null

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
                      ((p.me && myCumul > oppCumul) ||
                        (!p.me && oppCumul > myCumul))
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
                    <span className="vs-detail">
                      {t('round_gain_short', { g: p.round })}
                    </span>
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
                {t('round_gain', {
                  r: roundIndex + 1,
                  mr: maxRounds,
                  g: myRound,
                })}
              </span>
            </>
          )}
        </ResultHero>

        <ErrorRecap mistakes={mistakesRef.current} />

        {isLast && hasOpponent && (
          <ResultShare
            resultData={{
              c: categoryId,
              d: difficulty,
              l: lang,
              n: maxRounds,
              p1: myName,
              r1: [...myRoundScores],
              p2: opponentName,
              r2: opponentRoundScores.slice(0, maxRounds),
            }}
          />
        )}

        {isLast && mode === 'host' && (
          <ShareLink
            data={{
              p: myName,
              c: categoryId,
              d: difficulty,
              s: seed,
              n: maxRounds,
              l: lang,
              r: [...myRoundScores],
            }}
          />
        )}

        {isLast && (
          <div className="upsell">
            <p className="upsell-text">
              {bankExhausted ? t('upsell_done') : t('upsell_more')}
            </p>
            <button
              type="button"
              className="upsell-go"
              onClick={() => sound.select()}
            >
              {t('upsell_create')}
            </button>
          </div>
        )}

        <div className="result-actions">
          {!isLast && (
            <button type="button" className="btn btn-primary" onClick={continueRound}>
              {t('continue_challenge', { n: CHALLENGE_QUESTION_COUNT })}
            </button>
          )}
          <button
            type="button"
            className={`btn ${isLast ? 'btn-primary' : 'btn-secondary'}`}
            onClick={onExit}
          >
            {t('home')}
          </button>
        </div>
      </div>
    )
  }

  const barPct = (remaining / totalTime) * 100
  const urgent = remaining <= totalTime * 0.3

  return (
    <div className="quiz">
      <div className="quiz-topbar">
        <button className="btn-ghost" onClick={onExit}>
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
        <span className="quiz-score">⭐ {scoreRef.current}</span>
      </div>

      <div className="timer-track">
        <div
          className={`timer-fill ${urgent ? 'urgent' : ''}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
      <div className={`timer-value ${urgent ? 'urgent' : ''}`}>
        {remaining.toFixed(1)}s
      </div>

      <div className="quiz-body">
        <span className="quiz-cat" style={{ color: category.gradient[0] }}>
          {category.emoji} {catName} · {myName}
        </span>
        <h2 className="quiz-question">{question.question}</h2>

        <div className="options">
          {question.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className={`option ${selected === i ? 'chosen' : ''}`}
              disabled={locked}
              onClick={() => choose(i)}
            >
              <span className="option-letter">{['A', 'B', 'C', 'D'][i]}</span>
              <span className="option-text">{opt}</span>
            </button>
          ))}
        </div>

        {locked && <p className="suspense">{t('answer_saved')}</p>}
      </div>
    </div>
  )
}

function ShareLink({ data }) {
  const { t } = useI18n()
  const url = buildChallengeUrl(data)
  const [copied, setCopied] = useState(false)

  function copy() {
    sound.select()
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => setCopied(true),
        () => setCopied(false),
      )
    }
  }

  return (
    <div className="share">
      <p className="share-title">{t('share_play_title')}</p>
      <p className="share-sub">{t('share_play_sub')}</p>
      <div className="share-row">
        <input
          className="share-input"
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
        />
        <button type="button" className="btn-copy" onClick={copy}>
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
    </div>
  )
}
