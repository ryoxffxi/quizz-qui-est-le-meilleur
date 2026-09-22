import { useEffect, useMemo, useRef, useState } from 'react'
import { getCategory, getLocalizedQuestions } from '../content'
import { familyOf } from '../content/panneaux/signs'
import { ERRORS_BATCH_SIZE, SOLO_BATCH_SIZE, SOLO_MAX_BATCHES, personalityKey } from '../lib/game'
import { shuffleOptions } from '../lib/quiz'
import { optionsGridClass } from '../lib/optionsLayout'
import { getStats, getStreak, recordAnswer, recordRound, statsKey } from '../lib/stats'
import { countErrors, getErrorIds, recordFail, recordSuccess } from '../lib/errors'
import { loadSeen, markSeen, pickSoloBatch, saveSeen } from '../lib/revision'
import { emojiGrid } from '../lib/share'
import { track } from '../lib/analytics'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import ErrorRecap from './ErrorRecap'
import SignImage from './SignImage'
import ResultQuote from './ResultQuote'
import ResultHero from './ResultHero'
import ResultShare from './ResultShare'
import ResultAd from './ResultAd'
import { CatIcon, IconCheck, IconFlame, IconX } from './icons'
import '../styles/solo.css'

const LETTERS = ['A', 'B', 'C', 'D']
// Clavier : 1-4 ou A-D répondent. Sur AZERTY, la rangée des chiffres donne
// & é " ' sans Maj : on les accepte aussi.
const KEY_TO_INDEX = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3, '&': 0, é: 1, '"': 2, "'": 3 }

// Panneau qu'une question de la banque « panneaux » met en jeu : l'image de
// l'énoncé (gabarit « Que signifie ce panneau ? ») ou, pour les questions
// inversées (« Quel panneau signifie … ? », sans champ image), l'image de la
// bonne option.
function signOf(q) {
  return q.image ?? q.optionImages?.[q.correct]
}

// Banque jouable selon le mode :
//   - normal : la difficulté choisie, filtrée par famille de panneau si demandé ;
//   - errors : les deux difficultés, restreintes aux questions de la banque d'erreurs.
// Renvoie aussi `bankIds`, les ids de la banque de RÉFÉRENCE du stockage
// (le niveau joué, ou les deux niveaux en mode erreurs), indépendants du
// filtre par famille : ils servent à élaguer quizz_seen_* / quizz_errors_*
// sans toucher aux autres familles.
function buildPool(categoryId, difficulty, lang, mode, imageFamily) {
  if (mode === 'errors') {
    const all = [
      ...getLocalizedQuestions(categoryId, 'facile', lang),
      ...getLocalizedQuestions(categoryId, 'expert', lang),
    ]
    const ids = new Set(getErrorIds(categoryId))
    return { pool: all.filter((q) => ids.has(q.id)), bankIds: new Set(all.map((q) => q.id)) }
  }
  const list = getLocalizedQuestions(categoryId, difficulty, lang)
  const bankIds = new Set(list.map((q) => q.id))
  if (!imageFamily) return { pool: list, bankIds }
  return { pool: list.filter((q) => familyOf(signOf(q)) === imageFamily), bankIds }
}

// Bilan de session (score cumulé + toutes les erreurs de la session).
function SessionSummary({ session, lots, mistakes, note }) {
  const { t } = useI18n()
  return (
    <section className="session-card">
      <h3 className="session-title">{t('solo_session_title')}</h3>
      <p className="session-line">
        <b>{t('solo_session_score', { sc: session.correct, tot: session.answered })}</b>
        <span> · {t(lots > 1 ? 'solo_session_lots_n' : 'solo_session_lots', { k: lots })}</span>
      </p>
      {note && <p className="session-note">{note}</p>}
      {/* Le récap du lot dit déjà « sans faute » : ici, seulement s'il y a des erreurs. */}
      {mistakes.length > 0 && (
        <ErrorRecap
          mistakes={mistakes}
          title={t('solo_session_errors', { n: mistakes.length })}
          defaultOpen={false}
        />
      )}
    </section>
  )
}

// Mode Solo : révision par lots de 10, sans plafond tant qu'il reste des
// questions non vues. Progression, erreurs et série sont enregistrées à
// CHAQUE réponse validée (pas seulement en fin de lot).
//   mode 'errors'  : rejoue la banque d'erreurs de la catégorie (deux niveaux) ;
//   imageFamily    : restreint aux panneaux d'une famille (révision ciblée) ;
//   onReplayErrors : le shell ouvre /erreurs/<cat> (bouton de fin de lot).
export default function SoloQuiz({
  categoryId,
  difficulty,
  onExit,
  onChallenge,
  onReplayErrors,
  mode = 'normal',
  imageFamily,
}) {
  const { t, lang } = useI18n()
  const category = getCategory(categoryId)
  const catName = t(category.labelKey)
  const errorsMode = mode === 'errors'
  const modeName = errorsMode ? 'erreurs' : 'solo'
  const batchSize = errorsMode ? ERRORS_BATCH_SIZE : SOLO_BATCH_SIZE
  // Le store « vues » (cross-session) ne vaut qu'en mode normal : le mode
  // erreurs mélange les niveaux et ne doit pas polluer quizz_seen_<cat>_<diff>.
  const trackSeen = !errorsMode
  const statsDiff = errorsMode ? undefined : difficulty

  const { pool, bankIds } = useMemo(
    () => buildPool(categoryId, difficulty, lang, mode, imageFamily),
    [categoryId, difficulty, lang, mode, imageFamily],
  )

  // Mémoires mutables, lues et écrites UNIQUEMENT dans les handlers et effets.
  const seenStoreRef = useRef(null) // Set des ids vus (cross-session)
  const sessionSeenRef = useRef(null) // Set des ids répondus cette session
  const startedRef = useRef(false) // garde du track() de démarrage (StrictMode)
  const latestRef = useRef(null) // handlers courants pour l'écouteur clavier

  // Lot courant (init PURE : lecture seule du store, aucune écriture).
  const [batch, setBatch] = useState(() => {
    const store = trackSeen ? loadSeen(categoryId, difficulty) : new Set()
    const r = pickSoloBatch(pool, store, new Set(), batchSize)
    return { questions: r.questions.map(shuffleOptions), cycleReset: r.cycleReset, number: 1 }
  })
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null) // choix courant
  const [validated, setValidated] = useState(false)
  const [results, setResults] = useState([]) // bonne/mauvaise par question du lot
  const [mistakes, setMistakes] = useState([]) // erreurs du lot
  const [sessionMistakes, setSessionMistakes] = useState([]) // erreurs de la session
  const [session, setSession] = useState({ answered: 0, correct: 0 })
  const [screen, setScreen] = useState('play') // 'play' | 'result' | 'session'
  const [result, setResult] = useState(null) // instantané de fin de lot

  const questions = batch.questions
  const question = questions[index]
  const correctCount = results.filter(Boolean).length
  const remaining = pool.length - session.answered // questions non jouées cette session

  function getStore() {
    if (!seenStoreRef.current) {
      seenStoreRef.current = trackSeen ? loadSeen(categoryId, difficulty) : new Set()
    }
    return seenStoreRef.current
  }
  function getSession() {
    if (!sessionSeenRef.current) sessionSeenRef.current = new Set()
    return sessionSeenRef.current
  }

  // Cycle de révision bouclé dès le premier lot : on repart d'un store vide
  // (les questions du lot seront marquées vues à la validation). Idempotent.
  useEffect(() => {
    if (!batch.cycleReset || !trackSeen) return
    const store = new Set()
    seenStoreRef.current = store
    saveSeen(categoryId, difficulty, store)
  }, [batch, trackSeen, categoryId, difficulty])

  // Banques qui changent (questions retirées ou passées à l'autre niveau par
  // une vague de contenu) : les ids du stockage absents de la banque de
  // référence sont élagués, mémoire « vues » en mode normal, banque d'erreurs
  // en mode erreurs, pour que les compteurs de l'accueil restent justes.
  // Idempotent (StrictMode) ; le lot courant n'en dépend pas.
  useEffect(() => {
    if (errorsMode) getErrorIds(categoryId, bankIds)
    else loadSeen(categoryId, difficulty, bankIds)
  }, [errorsMode, categoryId, difficulty, bankIds])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    track(errorsMode ? 'errors_replay' : 'solo_start', categoryId)
  }, [errorsMode, categoryId])

  function validateChoice(choice) {
    if (validated || choice == null || !question) return
    const isCorrect = choice === question.correct
    if (isCorrect) sound.correct()
    else sound.wrong()
    navigator.vibrate?.(isCorrect ? 10 : [30, 40, 30])

    // Progression, banque d'erreurs et mémoire « vue » : à la validation.
    recordAnswer(categoryId, question.difficulty || difficulty, isCorrect)
    if (isCorrect) recordSuccess(categoryId, question.id)
    else recordFail(categoryId, question.id)
    getSession().add(question.id)
    if (trackSeen) {
      getStore().add(question.id)
      markSeen(categoryId, difficulty, question.id)
    }

    setSelected(choice)
    setValidated(true)
    setResults((r) => [...r, isCorrect])
    setSession((s) => ({
      answered: s.answered + 1,
      correct: s.correct + (isCorrect ? 1 : 0),
    }))
    if (!isCorrect) {
      const entry = { question, chosen: choice }
      setMistakes((m) => [...m, entry])
      setSessionMistakes((m) => [...m, entry])
    }
  }

  // Fin de lot : record et historique (recordRound), instantané pour l'écran.
  function finishBatch() {
    const total = questions.length
    const score = correctCount
    const key = statsKey(categoryId, statsDiff, modeName)
    const before = getStats()
    const prevBucket = before.byKey[key]
    const prevRound = [...before.history]
      .reverse()
      .find((h) => h.cat === categoryId && h.mode === modeName && (errorsMode || h.diff === difficulty))
    recordRound({ cat: categoryId, diff: statsDiff, mode: modeName, score, total })
    const after = getStats()
    const bucket = after.byKey[key]

    if (total > 0 && score === total) sound.win()
    else sound.select()
    track('solo_lot_end', categoryId)

    setResult({
      score,
      total,
      best: bucket?.best ?? score,
      bestTotal: bucket?.bestTotal ?? total,
      isNewRecord: score > 0 && (!prevBucket || score > prevBucket.best),
      delta: prevRound && prevRound.total === total ? score - prevRound.score : null,
      streak: getStreak(),
      errorsCount: countErrors(categoryId),
      totals: after.total,
      quoteSeed: Math.floor(Math.random() * 100000),
      grid: emojiGrid(results),
    })
    setScreen('result')
  }

  function next() {
    if (!validated) return
    if (index + 1 >= questions.length) {
      finishBatch()
      return
    }
    sound.select()
    setIndex((i) => i + 1)
    setSelected(null)
    setValidated(false)
  }

  // Lot suivant : questions non encore jouées cette session, non vues d'abord.
  function continueBatch() {
    const store = getStore()
    const r = pickSoloBatch(pool, store, getSession(), batchSize)
    if (r.questions.length === 0) return
    sound.select()
    if (r.cycleReset && trackSeen) {
      store.clear()
      saveSeen(categoryId, difficulty, store)
    }
    setBatch((b) => ({
      questions: r.questions.map(shuffleOptions),
      cycleReset: false,
      number: b.number + 1,
    }))
    setIndex(0)
    setSelected(null)
    setValidated(false)
    setResults([])
    setMistakes([])
    setResult(null)
    setScreen('play')
  }

  // Validation DIRECTE au premier tap (la révision privilégie le rythme ; la
  // double confirmation reste réservée au Défi).
  function handleOption(i) {
    if (validated) return
    validateChoice(i)
  }

  // Une fois validé, un tap n'importe où avance, sauf sur le feedback et les
  // options (on relit sans risque) ; le bouton explicite reste.
  function handleBodyClick(e) {
    if (e.target.closest && e.target.closest('.feedback, .options')) return
    next()
  }

  // Quitter en cours de session : bilan avant de partir (rien joué : direct).
  function quit() {
    track('solo_quit', categoryId)
    if (session.answered === 0) {
      onExit()
      return
    }
    sound.select()
    setScreen('session')
  }

  // Clavier : 1-4 / A-D répondent, Entrée ou Espace passent à la suite.
  // L'écouteur est posé une fois ; il lit les handlers courants via latestRef.
  useEffect(() => {
    latestRef.current = { handleOption, next, validated, screen, optionCount: question?.options?.length || 0 }
  })
  useEffect(() => {
    function onKey(e) {
      const cur = latestRef.current
      if (!cur || cur.screen !== 'play') return
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      const target = e.target
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
      if (e.key === 'Enter' || e.key === ' ') {
        // Un bouton focalisé (hors option) s'active tout seul : on n'y touche pas.
        const btn = target?.closest?.('button')
        if (btn && !btn.classList.contains('option')) return
        if (!cur.validated) return
        e.preventDefault()
        cur.next()
        return
      }
      const idx = KEY_TO_INDEX[String(e.key).toLowerCase()]
      if (idx != null && idx < cur.optionCount) cur.handleOption(idx)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ---------- Banque vide (mode erreurs purgé, famille sans question) ----------
  if (questions.length === 0) {
    return (
      <div className="quiz">
        <div className="errors-empty">
          <p className="errors-empty-title">
            {errorsMode ? t('errors_empty_title') : t('solo_empty')}
          </p>
          {errorsMode && <p className="errors-empty-sub">{t('errors_empty_sub')}</p>}
          <button type="button" className="btn btn-primary" onClick={onExit}>
            {t('home')}
          </button>
        </div>
      </div>
    )
  }

  const sessionPct = session.answered
    ? Math.round((session.correct / session.answered) * 100)
    : 0

  // ---------- Bilan de session (on arrête en cours de route) ----------
  if (screen === 'session') {
    return (
      <div className="quiz">
        <ResultHero
          category={category}
          score={session.correct}
          total={session.answered}
          label={t('solo_session_title')}
          sublabel={t(batch.number > 1 ? 'solo_session_lots_n' : 'solo_session_lots', { k: batch.number })}
        />
        <ErrorRecap
          mistakes={sessionMistakes}
          title={t('solo_session_errors', { n: sessionMistakes.length })}
        />
        <div className="result-actions">
          <button
            type="button"
            className="btn btn-primary reveal"
            onClick={() => {
              sound.select()
              setScreen('play')
            }}
          >
            {t('solo_resume')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onExit}>
            {t('home')}
          </button>
        </div>
      </div>
    )
  }

  // ---------- Résultat de lot ----------
  if (screen === 'result' && result) {
    const { score, total } = result
    const canContinue = remaining > 0
    const nextSize = Math.min(batchSize, remaining)
    const showSession = batch.number % SOLO_MAX_BATCHES === 0 || !canContinue
    const precision = result.totals.answered
      ? Math.round((result.totals.correct / result.totals.answered) * 100)
      : 0
    const streakLabel =
      result.streak.current > 1
        ? t('solo_streak', { n: result.streak.current })
        : t('solo_streak_one')
    let deltaLabel = null
    if (result.delta != null) {
      if (result.delta > 0) deltaLabel = t('solo_delta_up', { d: result.delta })
      else if (result.delta < 0) deltaLabel = t('solo_delta_down', { d: result.delta })
      else deltaLabel = t('solo_delta_same')
    }

    return (
      <div className="quiz">
        <ResultHero
          category={category}
          score={score}
          total={total}
          label={t(personalityKey(score, total))}
          sublabel={
            errorsMode
              ? t('errors_title')
              : t('solo_lot_progress', { b: batch.number, i: total, n: total })
          }
        />

        <ResultQuote correct={score} total={total} seed={result.quoteSeed} />

        {/* Record, évolution et série : les repères qui donnent envie de rejouer. */}
        <div className="solo-meta">
          <span className={`solo-chip ${result.isNewRecord ? 'new' : ''}`}>
            {t('solo_record', { best: result.best, tot: result.bestTotal })}
            {result.isNewRecord && <b> · {t('solo_record_new')}</b>}
          </span>
          {deltaLabel && (
            <span className={`solo-chip ${result.delta > 0 ? 'up' : result.delta < 0 ? 'down' : ''}`}>
              {deltaLabel}
            </span>
          )}
          {result.streak.current > 0 && (
            <span className="solo-chip streak">
              <IconFlame size={14} strokeWidth={2.2} />
              {streakLabel}
            </span>
          )}
        </div>

        <ErrorRecap mistakes={mistakes} />

        {showSession && (
          <SessionSummary
            session={session}
            lots={batch.number}
            mistakes={sessionMistakes}
            note={!canContinue ? t('solo_session_done') : null}
          />
        )}

        {/* Total cumulé toutes sessions, en tuiles. */}
        <div className="stat-tiles">
          <div>
            <b>{result.totals.answered}</b>
            <span>{t('tile_answered')}</span>
          </div>
          <div>
            <b>{result.totals.correct}</b>
            <span>{t('tile_correct')}</span>
          </div>
          <div>
            <b>{precision}%</b>
            <span>{t('tile_precision')}</span>
          </div>
        </div>

        <ResultShare
          resultData={{
            solo: 1,
            c: categoryId,
            d: difficulty || 'facile',
            l: lang,
            sc: score,
            tot: total,
            mode: modeName,
            grid: result.grid,
          }}
        />

        <ResultAd />

        <div className="result-actions">
          {canContinue && (
            <button type="button" className="btn btn-primary reveal" onClick={continueBatch}>
              {t('solo_again', { n: nextSize })}
            </button>
          )}
          {!errorsMode && result.errorsCount > 0 && onReplayErrors && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                sound.select()
                onReplayErrors()
              }}
            >
              {t('solo_replay_errors', { n: result.errorsCount })}
            </button>
          )}
          {!errorsMode && onChallenge && (
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
          )}
          <button
            type="button"
            className={`btn ${canContinue ? 'btn-secondary' : 'btn-primary reveal'}`}
            onClick={onExit}
          >
            {t('home')}
          </button>
        </div>
      </div>
    )
  }

  // ---------- Question en cours ----------
  const done = index + (validated ? 1 : 0)
  const isGood = validated && selected === question.correct
  const hasOptionImages = Array.isArray(question.optionImages) && question.optionImages.length > 0

  return (
    <div className="quiz">
      <div className="quiz-topbar">
        <button type="button" className="btn-ghost" onClick={quit}>
          {t('quit')}
        </button>
        <span className="quiz-progress">
          {errorsMode
            ? t('errors_lot_progress', { i: index + 1, n: questions.length })
            : t('solo_lot_progress', { b: batch.number, i: index + 1, n: questions.length })}
        </span>
        {session.answered > 0 && (
          <span
            className="solo-session-pill"
            aria-label={t('solo_session_counter_aria', { n: session.answered, pct: sessionPct })}
          >
            {t('solo_session_counter', { n: session.answered, pct: sessionPct })}
          </span>
        )}
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-label={t('solo_progress_aria')}
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={done}
      >
        <div className="progress-fill" style={{ '--fill': done / questions.length }} />
      </div>

      <div className="quiz-body" onClick={validated ? handleBodyClick : undefined}>
        <span className="quiz-cat" style={{ '--cat': category.gradient[0] }}>
          <CatIcon id={category.id} size={14} strokeWidth={2.2} />
          {errorsMode ? `${catName} · ${t('errors_title')}` : catName}
        </span>
        {question.image && <SignImage id={question.image} className="quiz-sign" />}
        <h2 className="quiz-question">{question.question}</h2>

        <div className={`options ${optionsGridClass(question)}`}>
          {question.options.map((opt, i) => {
            const isChosen = selected === i
            const img = hasOptionImages ? question.optionImages[i] : null
            let state = ''
            if (validated) {
              if (i === question.correct) state = 'correct'
              else if (isChosen) state = 'wrong'
              else state = 'dim'
            } else if (isChosen) {
              state = 'chosen'
            }
            let letter = LETTERS[i]
            if (validated && i === question.correct) letter = <IconCheck size={14} strokeWidth={3} />
            else if (validated && isChosen) letter = <IconX size={14} strokeWidth={3} />
            return (
              <button
                key={i}
                type="button"
                className={`option ${state} ${img ? 'has-sign' : ''}`}
                onClick={() => handleOption(i)}
                aria-label={img ? opt : undefined}
              >
                <span className="option-letter">{letter}</span>
                {/* alt="" : le nom est déjà dans aria-label, la description
                    neutre ferait doublon pour le lecteur d'écran. */}
                {img && <SignImage id={img} className="option-sign" alt="" />}
                <span className={`option-text ${img ? 'sr-only' : ''}`}>{opt}</span>
              </button>
            )
          })}
        </div>

        <p className="step-hint">{validated ? t('hint_next') : t('hint_choose')}</p>

        <div className="feedback-live" aria-live="polite">
          {validated && (
            <div className={`feedback ${isGood ? 'good' : 'bad'}`}>
              <strong>{isGood ? t('feedback_correct') : t('feedback_wrong')}</strong>
              <p>{question.explanation}</p>
            </div>
          )}
        </div>
      </div>

      {validated && (
        <div className="quiz-actions">
          <button type="button" className="btn btn-primary" onClick={next}>
            {index + 1 >= questions.length ? t('see_recap') : t('next_question')}
          </button>
        </div>
      )}
    </div>
  )
}
