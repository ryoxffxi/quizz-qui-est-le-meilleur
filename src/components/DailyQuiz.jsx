import { useEffect, useMemo, useState } from 'react'
import { getCategory, getLocalizedQuestions } from '../content'
import { DAILY_QUESTIONS } from '../lib/game'
import {
  buildDailyDeck,
  getDailyState,
  nextMidnightMs,
  saveDailyResult,
  todayKey,
} from '../lib/daily'
import { getStreak, recordAnswer, recordRound } from '../lib/stats'
import { recordFail, recordSuccess } from '../lib/errors'
import { optionsGridClass } from '../lib/optionsLayout'
import { buildShareText, emojiGrid, shareOrCopy } from '../lib/share'
import { track } from '../lib/analytics'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import ErrorRecap from './ErrorRecap'
import SignImage from './SignImage'
import ResultHero, { personalityKey } from './ResultHero'
import ResultShare from './ResultShare'
import ResultAd from './ResultAd'
import { CatIcon } from './icons'
import '../styles/daily.css'

const LETTERS = ['A', 'B', 'C', 'D']
const DAILY_PATH = '/quotidien'
const SHARE_MSG_KEY = {
  shared: 'daily_shared',
  copied: 'daily_copied',
  failed: 'daily_share_failed',
}

const pad2 = (n) => String(n).padStart(2, '0')

// 'YYYY-MM-DD' -> 'JJ/MM'.
function fmtDay(dateKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  return m ? `${m[3]}/${m[2]}` : dateKey
}

// Millisecondes -> 'HH:MM:SS'.
function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`
}

// Défi du jour : 10 questions identiques pour tout le monde (par catégorie et
// par jour de Paris), correction immédiate façon Solo, sans chrono. Déjà joué
// aujourd'hui : l'écran de résultat s'affiche directement. À monter sous un
// BankGate de la catégorie ; le shell le remonte (clé) quand la catégorie change.
export default function DailyQuiz({ categoryId, onExit, onHome }) {
  const { t, lang } = useI18n()
  const category = getCategory(categoryId)
  const catName = t(category.labelKey)

  // Jour figé au montage : une partie commencée avant minuit se termine sur son paquet.
  const [dateKey] = useState(() => todayKey())
  const pool = useMemo(
    () => [
      ...getLocalizedQuestions(categoryId, 'facile', lang),
      ...getLocalizedQuestions(categoryId, 'expert', lang),
    ],
    [categoryId, lang],
  )
  const deck = useMemo(
    () => buildDailyDeck(pool, dateKey, categoryId),
    [pool, dateKey, categoryId],
  )
  const total = deck.length || DAILY_QUESTIONS

  // Résultat déjà enregistré plus tôt dans la journée (partie non rejouable)…
  const [initial] = useState(() => getDailyState().results[categoryId] || null)
  // …ou obtenu à l'instant (on garde alors le récap des erreurs).
  const [fresh, setFresh] = useState(null)
  const saved = fresh || initial
  const alreadyPlayed = initial != null && fresh == null

  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [validated, setValidated] = useState(false)
  const [results, setResults] = useState([]) // boolean[] pour la grille emoji
  const [mistakes, setMistakes] = useState([])
  const [shareMsg, setShareMsg] = useState('')

  // Compte à rebours vers le prochain défi (minuit à Paris), sur l'écran de résultat.
  const [leftMs, setLeftMs] = useState(() => nextMidnightMs())
  const showResult = saved != null
  useEffect(() => {
    if (!showResult) return undefined
    const id = setInterval(() => setLeftMs(nextMidnightMs()), 1000)
    return () => clearInterval(id)
  }, [showResult])

  const question = deck[index]

  function validateChoice(i) {
    if (validated || !question) return
    const ok = i === question.correct
    recordAnswer(categoryId, question.difficulty, ok)
    if (ok) {
      sound.correct()
      recordSuccess(categoryId, question.id)
    } else {
      sound.wrong()
      recordFail(categoryId, question.id)
      setMistakes((m) => [...m, { question, chosen: i }])
    }
    setResults((r) => [...r, ok])
    setSelected(i)
    setValidated(true)
  }

  function finish() {
    const score = results.filter(Boolean).length
    const grid = emojiGrid(results)
    const state = saveDailyResult(categoryId, { score, grid })
    // Sans difficulté : la clé de progression devient '<cat>:quotidien' (pas de
    // collision avec 'code-route:mixte' de l'examen ni avec un niveau du Solo).
    recordRound({ cat: categoryId, mode: 'quotidien', score, total: deck.length })
    track('daily_end', categoryId)
    if (score > deck.length / 2) sound.win()
    else sound.lose()
    setFresh(state.results[categoryId] || { score, grid })
  }

  function next() {
    if (!validated) return
    if (index + 1 >= deck.length) {
      finish()
      return
    }
    sound.select()
    setIndex((i) => i + 1)
    setSelected(null)
    setValidated(false)
  }

  // Une fois validé, un tap n'importe où avance, sauf sur le feedback et les
  // options (on relit sans risque) ; le bouton explicite reste (comme en Solo).
  function handleBodyClick(e) {
    if (e.target.closest && e.target.closest('.feedback, .options')) return
    next()
  }

  // Partage façon Wordle : « Quizz du jour · Manga 8/10 », grille emoji, lien
  // vers /quotidien (le score reste sur la ligne du titre).
  async function share() {
    sound.select()
    const url = `${window.location.origin}${DAILY_PATH}`
    const title = t('daily_share_title', { cat: catName })
    const text = buildShareText({
      title: `${title} ${saved.score}/${total}`,
      grid: saved.grid,
      url,
    })
    const outcome = await shareOrCopy({ url, text, title })
    if (outcome !== 'failed') track('share', 'quotidien')
    setShareMsg(outcome)
  }

  // ----- Banque absente (ne devrait pas arriver sous BankGate) -----
  if (!showResult && deck.length === 0) {
    return (
      <div className="quiz daily-quiz">
        <div className="bank-gate">
          <p className="bank-gate-error">{t('bank_error')}</p>
          <button type="button" className="btn btn-primary" onClick={onHome}>
            {t('home')}
          </button>
        </div>
      </div>
    )
  }

  // ----- Résultat (fraîchement joué ou déjà joué aujourd'hui) -----
  if (showResult) {
    const streak = getStreak()
    return (
      <div className="quiz daily-quiz">
        <ResultHero
          category={category}
          score={saved.score}
          total={total}
          label={t(personalityKey(saved.score, total))}
          sublabel={t('daily_result_label', { date: fmtDay(dateKey) })}
        />

        {alreadyPlayed && (
          <div className="daily-played">
            <strong>{t('daily_played_title')}</strong>
            <p>{t('daily_played_text')}</p>
          </div>
        )}

        <p className="daily-grid" aria-hidden="true">
          {saved.grid}
        </p>

        <div className="stat-tiles">
          <div>
            <b>{streak.current} 🔥</b>
            <span>{t('daily_tile_streak')}</span>
          </div>
          <div>
            <b>{streak.best}</b>
            <span>{t('daily_tile_best')}</span>
          </div>
        </div>

        <p className="daily-countdown">
          {t('daily_next_in', { time: fmtCountdown(leftMs) })}
        </p>

        <div className="daily-share">
          <button type="button" className="btn btn-primary" onClick={share}>
            {t('daily_share')}
          </button>
          {shareMsg && <p className="resultshare-msg">{t(SHARE_MSG_KEY[shareMsg])}</p>}
        </div>

        {!alreadyPlayed && <ErrorRecap mistakes={mistakes} />}

        <ResultShare
          resultData={{
            solo: 1,
            c: categoryId,
            d: 'facile',
            l: lang,
            sc: saved.score,
            tot: total,
            mode: 'quotidien',
            grid: saved.grid,
          }}
        />

        <ResultAd />

        <div className="result-actions">
          <button type="button" className="btn btn-secondary" onClick={onHome}>
            {t('home')}
          </button>
        </div>
      </div>
    )
  }

  // ----- En jeu -----
  const visual =
    Array.isArray(question.optionImages) &&
    question.optionImages.length === question.options.length
  const isLast = index + 1 >= deck.length

  return (
    <div className="quiz daily-quiz">
      <div className="quiz-topbar">
        <button type="button" className="btn-ghost" onClick={onExit}>
          {t('quit')}
        </button>
        <span className="quiz-progress">
          {t('daily_topbar', { i: index + 1, n: deck.length })}
        </span>
      </div>

      <div
        className="progress-track"
        role="progressbar"
        aria-label={t('daily_topbar', { i: index + 1, n: deck.length })}
        aria-valuemin={0}
        aria-valuemax={deck.length}
        aria-valuenow={index + 1}
      >
        <div className="progress-fill" style={{ '--fill': (index + 1) / deck.length }} />
      </div>

      <div className="quiz-body" onClick={validated ? handleBodyClick : undefined}>
        <span className="quiz-cat" style={{ '--cat': category.gradient[0] }}>
          <CatIcon id={category.id} size={14} strokeWidth={2.2} />
          {catName}
        </span>
        {index === 0 && !validated && (
          <p className="daily-sub">{t('daily_sub', { n: deck.length })}</p>
        )}
        {question.image && <SignImage id={question.image} className="quiz-sign" />}
        <h2 className="quiz-question">{question.question}</h2>

        <div className={`options ${visual ? 'options-visual' : ''} ${optionsGridClass(question)}`}>
          {question.options.map((opt, i) => {
            const isChosen = selected === i
            let state = ''
            if (validated) {
              if (i === question.correct) state = 'correct'
              else if (isChosen) state = 'wrong'
              else state = 'dim'
            } else if (isChosen) {
              state = 'chosen'
            }
            return (
              <button
                key={i}
                type="button"
                className={`option ${state} ${visual ? 'option-visual' : ''}`}
                aria-label={visual ? opt : undefined}
                onClick={() => validateChoice(i)}
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
            )
          })}
        </div>

        <p className="step-hint">{validated ? t('hint_next') : t('hint_choose')}</p>

        {validated && (
          <div className={`feedback ${selected === question.correct ? 'good' : 'bad'}`}>
            <strong>
              {selected === question.correct ? t('feedback_correct') : t('feedback_wrong')}
            </strong>
            <p>{question.explanation}</p>
          </div>
        )}
      </div>

      {validated && (
        <div className="quiz-actions">
          <button type="button" className="btn btn-primary" onClick={next}>
            {isLast ? t('see_recap') : t('next_question')}
          </button>
        </div>
      )}
    </div>
  )
}
