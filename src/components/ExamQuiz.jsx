import { useEffect, useRef, useState } from 'react'
import { getCategory, getLocalizedQuestions } from '../content'
import {
  EXAM_PASS,
  EXAM_QUESTIONS,
  EXAM_READY_SCORE,
  EXAM_TIME_PER_QUESTION,
} from '../lib/game'
import { buildExamDeck, computeExamResult } from '../lib/exam'
import { optionsGridClass } from '../lib/optionsLayout'
import { loadSeen } from '../lib/revision'
import { getExamReadiness, getStats, recordAnswer, recordRound } from '../lib/stats'
import { countErrors, recordFail, recordSuccess } from '../lib/errors'
import { emojiGrid } from '../lib/share'
import { track } from '../lib/analytics'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import ErrorRecap from './ErrorRecap'
import SignImage from './SignImage'
import ResultHero from './ResultHero'
import ResultShare from './ResultShare'
import ResultAd from './ResultAd'
import { CatIcon } from './icons'
import '../styles/exam.css'

const TICK_MS = 200
const EXAM_CATEGORY = 'code-route'
const SIGN_CATEGORY = 'panneaux'
const LETTERS = ['A', 'B', 'C', 'D']
const HISTORY_SHOWN = 3

// Examen blanc du code de la route (format ETG : 40 questions, 20 s chacune,
// reçu à partir de 35, correction seulement à la fin). À monter sous un
// BankGate ayant chargé 'code-route' ET 'panneaux'.
// « Refaire un examen » remonte la session avec une nouvelle clé : état et
// paquet repartent de zéro sans logique de réinitialisation.
// Props facultatives : onReplayErrors(cat) affiche « Rejouer mes erreurs (n) » ;
// onReviseTheme(themeId) affiche « Réviser ce thème » (sans elle, le bouton
// n'apparaît pas : aucun rechargement de page en repli).
export default function ExamQuiz({ onExit, onHome, onReplayErrors, onReviseTheme }) {
  const [attempt, setAttempt] = useState(0)
  return (
    <ExamSession
      key={attempt}
      onExit={onExit}
      onHome={onHome}
      onReplayErrors={onReplayErrors}
      onReviseTheme={onReviseTheme}
      onRestart={() => setAttempt((a) => a + 1)}
    />
  )
}

// Paquet de l'examen à partir des deux banques (déjà chargées) et des ids déjà
// vus en Solo, pour privilégier les questions nouvelles.
function buildDeckFromBanks(lang) {
  const route = [
    ...getLocalizedQuestions(EXAM_CATEGORY, 'facile', lang),
    ...getLocalizedQuestions(EXAM_CATEGORY, 'expert', lang),
  ]
  const panneaux = [
    ...getLocalizedQuestions(SIGN_CATEGORY, 'facile', lang),
    ...getLocalizedQuestions(SIGN_CATEGORY, 'expert', lang),
  ]
  const seen = new Set([
    ...loadSeen(EXAM_CATEGORY, 'facile'),
    ...loadSeen(EXAM_CATEGORY, 'expert'),
  ])
  return buildExamDeck({ route, panneaux, seen })
}

// 'YYYY-MM-DD' -> 'JJ/MM' (dates de l'historique) ; sinon la valeur telle quelle.
function fmtDay(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''))
  return m ? `${m[3]}/${m[2]}` : String(value ?? '')
}

function ExamSession({ onExit, onHome, onRestart, onReplayErrors, onReviseTheme }) {
  const { t, lang } = useI18n()
  const category = getCategory(EXAM_CATEGORY)

  // Paquet tiré une fois (init paresseuse, pure : sûr en StrictMode).
  const [deck] = useState(() => buildDeckFromBanks(lang))
  const [phase, setPhase] = useState('rules') // 'rules' | 'play' | 'done'
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [remaining, setRemaining] = useState(EXAM_TIME_PER_QUESTION)
  const [quitAsk, setQuitAsk] = useState(false)
  const [result, setResult] = useState(null)

  const answersRef = useRef([]) // [{ question, chosen }]
  const lockedRef = useRef(false) // réponse déjà enregistrée pour la question courante
  const selectedRef = useRef(null) // choix courant, lu par le chrono à l'expiration
  const commitRef = useRef(null) // dernière version de commit(), pour le chrono

  const total = deck.length
  const question = deck[index]

  function finish() {
    const res = computeExamResult(answersRef.current)
    recordRound({
      cat: EXAM_CATEGORY,
      diff: 'mixte',
      mode: 'examen',
      score: res.score,
      total: res.total,
    })
    track('exam_end', res.passed ? 'ok' : 'ko')
    if (res.passed) sound.win()
    else sound.lose()
    setResult(res)
    setPhase('done')
  }

  // Enregistre la réponse (null = temps écoulé, comptée fausse) et avance.
  // Verrou contre le double appel (tap + chrono dans la même fenêtre).
  function commit(choice) {
    if (lockedRef.current || !question) return
    lockedRef.current = true
    const ok = choice != null && choice === question.correct
    recordAnswer(question.category, question.difficulty, ok)
    if (ok) recordSuccess(question.category, question.id)
    else recordFail(question.category, question.id)
    answersRef.current.push({ question, chosen: choice })
    if (index + 1 >= total) {
      finish()
      return
    }
    setIndex(index + 1)
    setSelected(null)
    setRemaining(EXAM_TIME_PER_QUESTION)
  }

  // Le chrono appelle toujours la version la plus récente de commit().
  useEffect(() => {
    commitRef.current = commit
  })

  // Chrono d'une question, relancé à chaque changement de question.
  useEffect(() => {
    if (phase !== 'play') return undefined
    lockedRef.current = false
    selectedRef.current = null
    const start = performance.now()
    let lastSecond = EXAM_TIME_PER_QUESTION
    const id = setInterval(() => {
      const left = Math.max(0, EXAM_TIME_PER_QUESTION - (performance.now() - start) / 1000)
      setRemaining(left)
      const second = Math.ceil(left)
      if (second !== lastSecond) {
        lastSecond = second
        if (second > 0 && second <= 5) sound.tick()
      }
      if (left <= 0) {
        clearInterval(id)
        commitRef.current?.(selectedRef.current)
      }
    }, TICK_MS)
    return () => clearInterval(id)
  }, [phase, index])

  function begin() {
    sound.unlock()
    sound.select()
    track('exam_start')
    setPhase('play')
  }

  // Un tap choisit (modifiable), un second tap sur le même choix valide.
  function select(i) {
    if (lockedRef.current) return
    sound.select()
    if (selected === i) {
      commit(i)
      return
    }
    selectedRef.current = i
    setSelected(i)
  }

  const canRevise = typeof onReviseTheme === 'function'
  function reviseTheme(theme) {
    if (!canRevise) return
    sound.select()
    onReviseTheme(theme)
  }

  // ----- Banque absente (ne devrait pas arriver sous BankGate) -----
  if (total === 0) {
    return (
      <div className="quiz exam-quiz">
        <div className="bank-gate">
          <p className="bank-gate-error">{t('bank_error')}</p>
          <button type="button" className="btn btn-primary" onClick={onHome}>
            {t('home')}
          </button>
        </div>
      </div>
    )
  }

  // ----- Règles avant de commencer -----
  if (phase === 'rules') {
    const signCount = deck.filter((q) => q.category === SIGN_CATEGORY).length
    return (
      <div className="quiz exam-quiz">
        <div className="quiz-topbar">
          <button type="button" className="btn-ghost" onClick={onExit}>
            {t('quit')}
          </button>
          <span className="quiz-progress">{t('exam_title')}</span>
        </div>
        <div className="setup-card">
          <span className="hero-cat" style={{ '--cat': category.gradient[0] }}>
            <CatIcon id={category.id} size={14} strokeWidth={2.2} />
            {t(category.labelKey)}
          </span>
          <h2 className="setup-title">{t('exam_rules_title')}</h2>
          <p className="setup-sub">{t('exam_rules_sub')}</p>
          <ul className="exam-rules">
            <li>{t('exam_rule_questions', { n: total, s: signCount })}</li>
            <li>{t('exam_rule_time', { s: EXAM_TIME_PER_QUESTION })}</li>
            <li>{t('exam_rule_pass', { pass: EXAM_PASS })}</li>
            <li>{t('exam_rule_nofeedback')}</li>
          </ul>
        </div>
        <div className="quiz-actions">
          <button type="button" className="btn btn-primary" onClick={begin}>
            {t('exam_begin')}
          </button>
        </div>
      </div>
    )
  }

  // ----- Résultat -----
  if (phase === 'done' && result) {
    const res = result
    const outOf = res.total || EXAM_QUESTIONS
    const readiness = getExamReadiness()
    const history = (getStats().history || [])
      .filter((h) => h.mode === 'examen')
      .slice(-HISTORY_SHOWN)
      .reverse()
    const avgShown =
      readiness.avg == null ? null : Math.round(readiness.avg * 10) / 10
    // Banque d'erreurs code-route (ce que « Rejouer mes erreurs » rejoue).
    const errorsCount = countErrors(EXAM_CATEGORY)
    const threshold = res.passed
      ? t('exam_threshold', { pass: EXAM_PASS, total: outOf })
      : `${t('exam_threshold', { pass: EXAM_PASS, total: outOf })} ${t('exam_missed_by', { n: EXAM_PASS - res.score })}`

    return (
      <div className="quiz exam-quiz">
        <ResultHero
          category={category}
          score={res.score}
          total={outOf}
          verdict={res.passed ? t('exam_passed') : t('exam_failed')}
          tone={res.passed ? 'good' : 'bad'}
          sublabel={threshold}
        />

        {/* Bilan par thème : barres horizontales, thème le plus faible mis en avant. */}
        <section className="exam-section">
          <h3 className="exam-section-title">{t('exam_themes_title')}</h3>
          <div className="exam-themes">
            {res.byTheme.map((b) => {
              const weak = b.theme === res.weakest
              return (
                <div key={b.theme} className={`exam-theme ${weak ? 'weak' : ''}`}>
                  <span className="exam-theme-name">
                    {t(`exam_theme_${b.theme}`)}
                    {weak && <span className="exam-theme-badge">{t('exam_theme_weak')}</span>}
                  </span>
                  <span className="exam-theme-score">
                    {b.correct}/{b.total}
                  </span>
                  <div className="exam-theme-bar">
                    <div
                      className="exam-theme-fill"
                      style={{ width: `${b.total ? (b.correct / b.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {canRevise && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!res.weakest}
              onClick={() => reviseTheme(res.weakest)}
            >
              {t('exam_revise_theme')}
            </button>
          )}
        </section>

        {/* Jauge « Prêt pour l'examen ? » + 3 derniers examens. */}
        <section className="exam-section">
          <h3 className="exam-section-title">{t('exam_readiness_title')}</h3>
          {avgShown != null && (
            <>
              <div
                className="exam-ready-track"
                style={{ '--target': (EXAM_READY_SCORE / outOf) * 100 }}
              >
                <div
                  className={`exam-ready-fill ${readiness.ready ? 'ready' : ''}`}
                  style={{ width: `${Math.min(100, (readiness.avg / outOf) * 100)}%` }}
                />
                <span className="exam-ready-mark" aria-hidden="true" />
              </div>
              <p className="exam-ready-avg">
                {t(readiness.exams > 1 ? 'exam_readiness_avg' : 'exam_readiness_avg_one', {
                  n: readiness.exams,
                  avg: avgShown,
                  total: outOf,
                })}
              </p>
              <p className={`exam-ready-verdict ${readiness.ready ? 'ready' : ''}`}>
                {t(readiness.ready ? 'exam_readiness_ready' : 'exam_readiness_not_ready', {
                  target: EXAM_READY_SCORE,
                  total: outOf,
                })}
              </p>
            </>
          )}
          {history.length > 0 && (
            <>
              <h4 className="exam-history-title">{t('exam_history_title')}</h4>
              <div className="exam-history">
                {history.map((h, i) => (
                  <span
                    key={`${h.date}-${i}`}
                    className={`exam-history-chip ${h.score >= EXAM_PASS ? 'pass' : 'fail'}`}
                  >
                    {h.score}/{h.total}
                    <small>{fmtDay(h.date)}</small>
                  </span>
                ))}
              </div>
            </>
          )}
        </section>

        <ErrorRecap mistakes={res.mistakes} />

        <ResultShare
          resultData={{
            solo: 1,
            c: EXAM_CATEGORY,
            d: 'expert',
            l: lang,
            sc: res.score,
            tot: outOf,
            mode: 'examen',
            grid: emojiGrid(res.results),
          }}
        />

        <ResultAd />

        <div className="result-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              sound.select()
              onRestart()
            }}
          >
            {t('exam_retry')}
          </button>
          {onReplayErrors && errorsCount > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                sound.select()
                onReplayErrors(EXAM_CATEGORY)
              }}
            >
              {t('exam_replay_errors', { n: errorsCount })}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onHome}>
            {t('home')}
          </button>
        </div>
      </div>
    )
  }

  // ----- En jeu -----
  const questionCategory = getCategory(question.category) || category
  const visual =
    Array.isArray(question.optionImages) &&
    question.optionImages.length === question.options.length
  const urgent = remaining <= EXAM_TIME_PER_QUESTION * 0.3

  return (
    <div className="quiz exam-quiz">
      <div className="quiz-topbar">
        <button type="button" className="btn-ghost" onClick={() => setQuitAsk(true)}>
          {t('quit')}
        </button>
        <span className="quiz-progress">{t('exam_counter', { i: index + 1, n: total })}</span>
      </div>

      {quitAsk && (
        <div className="exam-confirm" role="alertdialog" aria-labelledby="exam-quit-title">
          <p id="exam-quit-title" className="exam-confirm-title">
            {t('exam_quit_title')}
          </p>
          <p className="exam-confirm-text">{t('exam_quit_text')}</p>
          <div className="exam-confirm-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                sound.select()
                setQuitAsk(false)
              }}
            >
              {t('exam_quit_cancel')}
            </button>
            <button type="button" className="btn exam-btn-quit" onClick={onExit}>
              {t('exam_quit_confirm')}
            </button>
          </div>
        </div>
      )}

      {/* Barre vidée par l'animation CSS `drain` (index.css), relancée à
          chaque question par la clé ; même convention que le Défi. */}
      <div className="timer-track">
        <div
          key={index}
          className={`timer-fill ${urgent ? 'urgent' : ''}`}
          style={{ animationDuration: `${EXAM_TIME_PER_QUESTION}s` }}
        />
      </div>
      <div className={`timer-value ${urgent ? 'urgent' : ''}`}>
        {t('exam_time_left', { s: Math.ceil(remaining) })}
      </div>

      <div className="quiz-body">
        <span className="quiz-cat" style={{ '--cat': questionCategory.gradient[0] }}>
          <CatIcon id={questionCategory.id} size={14} strokeWidth={2.2} />
          {t(questionCategory.labelKey)}
        </span>
        {question.image && <SignImage id={question.image} className="quiz-sign" />}
        <h2 className="quiz-question">{question.question}</h2>

        <div className={`options ${visual ? 'options-visual' : ''} ${optionsGridClass(question)}`}>
          {question.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className={`option ${selected === i ? 'chosen' : ''} ${visual ? 'option-visual' : ''}`}
              aria-pressed={selected === i}
              aria-label={visual ? opt : undefined}
              onClick={() => select(i)}
            >
              <span className="option-letter">{LETTERS[i]}</span>
              {visual ? (
                <>
                  {/* alt="" : le nom est dans aria-label, pas de doublon. */}
                  <SignImage id={question.optionImages[i]} className="option-sign" alt="" />
                  <span className="option-text sr-only">{opt}</span>
                </>
              ) : (
                <span className="option-text">{opt}</span>
              )}
            </button>
          ))}
        </div>

        <p className="step-hint">
          {selected == null ? t('exam_hint_choose') : t('exam_hint_selected')}
        </p>
      </div>

      <div className="quiz-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={selected == null}
          onClick={() => commit(selected)}
        >
          {t('exam_validate')}
        </button>
      </div>
    </div>
  )
}
