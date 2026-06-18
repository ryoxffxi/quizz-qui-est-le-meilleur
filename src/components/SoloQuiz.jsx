import { useEffect, useMemo, useRef, useState } from 'react'
import { getCategory, getLocalizedQuestions } from '../content'
import { SOLO_BATCH_SIZE, SOLO_MAX_BATCHES } from '../lib/game'
import { shuffle, shuffleOptions } from '../lib/quiz'
import { getStats, recordRound } from '../lib/stats'
import { loadSeen, saveSeen } from '../lib/revision'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import ErrorRecap from './ErrorRecap'
import ResultQuote from './ResultQuote'
import ResultHero, { personalityKey } from './ResultHero'
import ResultShare from './ResultShare'
import ResultAd from './ResultAd'

export default function SoloQuiz({ categoryId, difficulty, onExit, onChallenge }) {
  const { t, lang } = useI18n()
  const category = getCategory(categoryId)
  const catName = t(category.labelKey)
  // Banque complète de la difficulté choisie, déjà localisée.
  const pool = useMemo(
    () => getLocalizedQuestions(categoryId, difficulty, lang),
    [categoryId, difficulty, lang],
  )

  // Nombre total de lots disponibles (4 max, ou moins si banque plus petite).
  const totalBatches = Math.min(
    SOLO_MAX_BATCHES,
    Math.ceil(pool.length / SOLO_BATCH_SIZE),
  )

  // Mémoire CROSS-SESSION des questions déjà vues (révision : on évite de
  // retomber sur les mêmes au retour sur le site). Init paresseuse, lecture seule.
  const seenStoreRef = useRef(null)
  if (seenStoreRef.current === null) {
    seenStoreRef.current = loadSeen(categoryId, difficulty)
  }

  // Tire un lot de questions encore non vues (cette session ET les précédentes),
  // options mélangées. Quand toute la banque a été parcourue, on relance un cycle
  // (ordre aléatoire). Sélection PURE : l'écriture localStorage est faite via effet.
  function pickBatch(sessionSeen) {
    const store = seenStoreRef.current
    let unseen = pool.filter(
      (q) => !sessionSeen.has(q.id) && !store.has(q.id),
    )
    if (unseen.length < SOLO_BATCH_SIZE) {
      store.clear() // banque parcourue -> nouveau cycle de révision
      unseen = pool.filter((q) => !sessionSeen.has(q.id))
    }
    return shuffle(unseen).slice(0, SOLO_BATCH_SIZE).map(shuffleOptions)
  }

  // Lot courant (init PURE, sûr en StrictMode).
  const [questions, setQuestions] = useState(() => pickBatch(new Set()))

  // Mémoire des questions déjà jouées sur la session, init paresseuse.
  const seenIdsRef = useRef(null)
  if (seenIdsRef.current === null) {
    seenIdsRef.current = new Set(questions.map((q) => q.id))
  }

  // Persiste les questions vues (cross-session) à chaque nouveau lot affiché.
  useEffect(() => {
    const store = seenStoreRef.current
    questions.forEach((q) => store.add(q.id))
    saveSeen(categoryId, difficulty, store)
  }, [questions, categoryId, difficulty])

  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null) // choix courant (modifiable)
  const [validated, setValidated] = useState(false)
  const [mistakes, setMistakes] = useState([])
  const [correctCount, setCorrectCount] = useState(0)
  const [finished, setFinished] = useState(false)
  const [batchNumber, setBatchNumber] = useState(1) // lot en cours (1 → 4)
  const [quoteSeed, setQuoteSeed] = useState(0) // graine de la citation de fin

  const question = questions[index]

  function validateChoice(choice) {
    if (validated || choice == null) return
    const isCorrect = choice === question.correct
    if (isCorrect) {
      sound.correct()
      setCorrectCount((c) => c + 1)
    } else {
      sound.wrong()
      setMistakes((m) => [...m, { question, chosen: choice }])
    }
    setSelected(choice)
    setValidated(true)
  }

  function next() {
    if (index + 1 >= questions.length) {
      recordRound(questions.length, correctCount) // bilan de la manche -> total cumulé
      setQuoteSeed(Math.floor(Math.random() * 100000)) // citation tirée ici (handler)
      setFinished(true)
      return
    }
    sound.select()
    setIndex((i) => i + 1)
    setSelected(null)
    setValidated(false)
  }

  // Lance le lot suivant avec des questions non encore vues.
  function continueBatch() {
    sound.select()
    const batch = pickBatch(seenIdsRef.current)
    batch.forEach((q) => seenIdsRef.current.add(q.id))
    setQuestions(batch)
    setBatchNumber((n) => n + 1)
    setIndex(0)
    setSelected(null)
    setValidated(false)
    setMistakes([])
    setCorrectCount(0)
    setFinished(false)
  }

  // Clics successifs sur une réponse : choisir → valider.
  // Une fois validé, l'avancement est géré par le clic sur la zone (quiz-body),
  // pour éviter un double appel à next() quand le clic remonte (bubbling).
  function handleOption(i) {
    if (validated) return // 3e clic : laisse la bulle déclencher next()
    if (selected === i) {
      validateChoice(i) // 2e clic sur la MÊME réponse = valider
    } else {
      sound.select() // 1er clic (ou changement de choix) = sélectionner
      setSelected(i)
    }
  }

  const stepHint = validated
    ? t('hint_next')
    : selected === null
      ? t('hint_choose')
      : t('hint_validate')

  if (finished) {
    const remaining = pool.filter((q) => !seenIdsRef.current.has(q.id)).length
    const totals = getStats() // total cumulé (déjà mis à jour par recordRound)
    // 4 lots maximum (40 questions). On ne continue que s'il reste de quoi
    // remplir un lot complet ET qu'on n'a pas atteint la limite de lots.
    const canContinue =
      batchNumber < totalBatches && remaining >= SOLO_BATCH_SIZE

    return (
      <div className="quiz">
        <ResultHero category={category}>
          <div className="hero-score">
            {correctCount}
            <span className="hero-score-total">/{questions.length}</span>
          </div>
          <div className="hero-personality">
            {t(personalityKey(correctCount, questions.length))}
          </div>
          <span className="hero-round">
            {t('lot_label', { b: batchNumber, tb: totalBatches })}
          </span>
        </ResultHero>

        <ResultQuote correct={correctCount} total={questions.length} seed={quoteSeed} />

        <ErrorRecap mistakes={mistakes} />

        <p className="lifetime-stats">
          {t('stats_lifetime', { a: totals.answered, c: totals.correct })}
        </p>

        <ResultShare
          resultData={{
            solo: 1,
            c: categoryId,
            d: difficulty,
            l: lang,
            sc: correctCount,
            tot: questions.length,
          }}
        />

        <ResultAd />

        <div className="result-actions">
          {canContinue && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={continueBatch}
            >
              {t('continue_solo', { n: SOLO_BATCH_SIZE })}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              sound.select()
              onChallenge()
            }}
          >
            {t('challenge_a_friend')}
          </button>
          <button
            type="button"
            className={`btn ${canContinue ? 'btn-secondary' : 'btn-primary'}`}
            onClick={onExit}
          >
            {t('home')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="quiz">
      <div className="quiz-topbar">
        <button className="btn-ghost" onClick={onExit}>
          {t('quit')}
        </button>
        <span className="quiz-progress">
          {t('solo_topbar', {
            b: batchNumber,
            tb: totalBatches,
            i: index + 1,
            n: questions.length,
          })}
        </span>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Une fois validé, un clic n'importe où dans cette zone avance. */}
      <div className="quiz-body" onClick={validated ? next : undefined}>
        <span className="quiz-cat" style={{ color: category.gradient[0] }}>
          {category.emoji} {catName}
        </span>
        <h2 className="quiz-question">{question.question}</h2>

        <div className="options">
          {question.options.map((opt, i) => {
            const isChosen = selected === i
            let state = ''
            if (validated) {
              if (i === question.correct) state = 'correct'
              else if (isChosen) state = 'wrong'
            } else if (isChosen) {
              state = 'chosen'
            }
            return (
              <button
                key={i}
                type="button"
                className={`option ${state}`}
                onClick={() => handleOption(i)}
              >
                <span className="option-letter">{['A', 'B', 'C', 'D'][i]}</span>
                <span className="option-text">{opt}</span>
              </button>
            )
          })}
        </div>

        <p className="step-hint">{stepHint}</p>

        {validated && (
          <div
            className={`feedback ${
              selected === question.correct ? 'good' : 'bad'
            }`}
          >
            <strong>
              {selected === question.correct
                ? t('feedback_correct')
                : t('feedback_wrong')}
            </strong>
            <p>{question.explanation}</p>
          </div>
        )}
      </div>

      {validated && (
        <div className="quiz-actions">
          <button className="btn btn-primary" onClick={next}>
            {index + 1 >= questions.length ? t('see_recap') : t('next_question')}
          </button>
        </div>
      )}
    </div>
  )
}
