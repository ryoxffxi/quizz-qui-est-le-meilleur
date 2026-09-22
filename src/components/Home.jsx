import { useEffect, useId, useRef, useState } from 'react'
import Segmented from './Segmented'
import PanneauxRevision from './PanneauxRevision'
import HomeProgress from './HomeProgress'
import { countQuestions, getCategories, getCategory, loadBank } from '../content'
import {
  CHALLENGE_DEFAULT_ROUNDS,
  CHALLENGE_MAX_ROUNDS,
  CHALLENGE_QUESTION_COUNT,
  DAILY_QUESTIONS,
  EXAM_PASS,
  EXAM_QUESTIONS,
} from '../lib/game'
import { getExamReadiness, getProgress } from '../lib/stats'
import { countErrors } from '../lib/errors'
import { getDuels } from '../lib/duels'
import { getDailyState, todayKey } from '../lib/daily'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import {
  QMark,
  CatIcon,
  IconChevronRight,
  IconBook,
  IconBolt,
  IconCalendar,
  IconCheck,
  IconRefresh,
  IconTrophy,
} from './icons'
import '../styles/home.css'

const CHALLENGE_PLAYABLE = CHALLENGE_MAX_ROUNDS * CHALLENGE_QUESTION_COUNT

// Catégorie mise en avant en tête de liste (carte « héros », FR seulement).
const HERO_CATEGORY = 'code-route'

// Catégorie du défi du jour par défaut, quand aucune préférence n'est mémorisée.
const DAILY_DEFAULT = { fr: 'code-route' }
const DAILY_FALLBACK = 'culture-generale'

// Duels affichés dans « Mes duels ».
const DUELS_SHOWN = 5
const DAY_MS = 86400000

// Statut d'un duel -> clé i18n (table statique : i18n-check les voit).
const DUEL_STATUS_KEY = {
  sent: 'home_duel_status_sent',
  played: 'home_duel_status_played',
  answered: 'home_duel_status_answered',
}

// Préchauffe la banque d'une catégorie dès l'intention de jouer (pointerdown
// ou focus) : loadBank est idempotent et un échec réseau sera simplement
// retenté par l'écran de jeu (BankGate) ; on ne laisse aucune promesse rejetée.
function preloadBank(categoryId) {
  try {
    Promise.resolve(loadBank(categoryId)).catch(() => {})
  } catch {
    /* catégorie inconnue : rien à précharger */
  }
}

const sum = (arr) => arr.reduce((a, b) => a + b, 0)

// Date relative d'un duel (« hier », « il y a 3 jours ») ; au-delà d'un mois,
// la date courte. Aucun texte à traduire : Intl fait le travail.
function relativeDay(iso, locale, fmtDate) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((start(new Date()) - start(d)) / DAY_MS)
  if (days > 30 || days < 0) return fmtDate(iso, 'short')
  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day')
  } catch {
    return fmtDate(iso, 'short')
  }
}

// Métadonnées d'une carte de catégorie : jauge de couverture (questions vues
// du cycle en cours / banque), précision, record du niveau et pastille
// « n erreurs à revoir » (showErrors=false pour le héros, qui a déjà son lien
// « Mes erreurs (n) »). Rien n'est rendu tant que la catégorie n'a jamais été
// jouée à ce niveau et qu'aucune erreur n'est à montrer.
function CatMeta({ cat, difficulty, onErrors, showErrors = true }) {
  const { t, tn } = useI18n()
  const progress = getProgress(cat.id, difficulty)
  const errors = showErrors ? countErrors(cat.id) : 0
  if (progress.answered === 0 && progress.seen === 0 && errors === 0) return null
  const pct =
    progress.total > 0 ? Math.min(100, Math.round((progress.seen / progress.total) * 100)) : 0
  return (
    <span className="cat-meta">
      <span className="cat-gauge" aria-hidden="true">
        <span
          className="cat-gauge-fill"
          style={{ '--fill': pct / 100, '--cat': cat.gradient[0] }}
        />
      </span>
      <span className="cat-chips">
        <span className="cat-chip">{t('home_cover', { pct })}</span>
        {progress.accuracy != null && (
          <span className="cat-chip">{t('home_accuracy', { pct: progress.accuracy })}</span>
        )}
        {progress.best > 0 && (
          <span className="cat-chip cat-chip-record">
            <IconTrophy size={12} />
            <span>{t('home_record', { best: progress.best, tot: progress.bestTotal })}</span>
          </span>
        )}
        {errors > 0 && (
          <button
            type="button"
            className="cat-chip cat-chip-errors"
            onClick={() => {
              sound.select()
              onErrors(cat.id)
            }}
          >
            {tn('home_errors_chip', errors)}
          </button>
        )}
      </span>
    </span>
  )
}

// Bloc examen blanc de la carte héros (FR) : sous-titre, jauge « Prêt pour
// l'examen ? » (moyenne des 3 derniers examens blancs, vert dès 37/40),
// bouton « Passer un examen blanc » et lien « Mes erreurs (n) » du code.
function HeroExam({ onExam, onErrors }) {
  const { t, tn, fmtNumber } = useI18n()
  const readiness = getExamReadiness()
  const errors = countErrors(HERO_CATEGORY)
  const fill = readiness.avg != null ? Math.min(1, readiness.avg / EXAM_QUESTIONS) : 0
  const value =
    readiness.exams === 0
      ? t('home_ready_none')
      : tn('home_ready_avg', Math.min(readiness.exams, 3), {
          avg: fmtNumber(readiness.avg),
          total: EXAM_QUESTIONS,
        })
  return (
    <div className="hero-exam">
      <p className="hero-exam-sub">{t('home_exam_sub', { n: EXAM_QUESTIONS, pass: EXAM_PASS })}</p>
      <div className="hero-ready">
        <span className="hero-ready-row">
          <span className="hero-ready-label">{t('exam_readiness_title')}</span>
          <span className={`hero-ready-value${readiness.ready ? ' is-good' : ''}`}>{value}</span>
        </span>
        <span className="cat-gauge" aria-hidden="true">
          <span
            className={`cat-gauge-fill${readiness.ready ? ' is-good' : ''}`}
            style={{ '--fill': fill }}
          />
        </span>
      </div>
      <div className="hero-actions">
        <button
          type="button"
          className="btn btn-primary hero-exam-btn"
          onClick={() => {
            sound.select()
            onExam()
          }}
          onPointerDown={() => {
            // L'examen mêle code de la route et panneaux : les deux banques.
            preloadBank(HERO_CATEGORY)
            preloadBank('panneaux')
          }}
        >
          {t('home_exam_go')}
        </button>
        {errors > 0 && (
          <button
            type="button"
            className="hero-errors"
            onClick={() => {
              sound.select()
              onErrors(HERO_CATEGORY)
            }}
          >
            {t('home_errors_link', { n: errors })}
          </button>
        )}
      </div>
    </div>
  )
}

// Accueil « tableau de bord ». Contrat Home <-> App (src/lib/prefs.js côté
// shell) : les réglages (onglet, mode, niveau, dernière catégorie, catégorie
// du jour) arrivent par `prefs` et repartent par onPrefsChange(patch) ; Home
// ne lit pas localStorage pour ces champs. `initialTab` prime sur prefs.tab au
// premier rendu (lien profond /revision/panneaux).
//
// Tout ce qui est affiché ici est lu de façon synchrone (stats, erreurs,
// duels, défi du jour, manifeste des comptes) : aucune banque n'est chargée.
export default function Home({
  prefs,
  onPrefsChange = () => {},
  onStart,
  onDaily,
  onExam,
  onErrors,
  onFlashcards,
  onRematch,
  onInstall,
  initialTab,
}) {
  const { t, lang, locale, fmtNumber, fmtDate } = useI18n()
  const p = prefs || {}
  const mode = p.mode === 'challenge' ? 'challenge' : 'solo'
  const difficulty = p.difficulty === 'expert' ? 'expert' : 'facile'

  // Onglet : initialTab au premier rendu, puis les préférences (un clic passe
  // par onPrefsChange et lève l'amorce).
  const [tabOverride, setTabOverride] = useState(() =>
    initialTab === 'panneaux' || initialTab === 'quiz' ? initialTab : null,
  )
  const tab = tabOverride ?? (p.tab === 'panneaux' ? 'panneaux' : 'quiz')

  // Catégorie du défi du jour : choix de la session, sinon préférence, sinon
  // le défaut de la langue.
  const [dailyPick, setDailyPick] = useState(null)

  const catLabelId = useId()
  const duelsTitleId = useId()
  const chipsRef = useRef(null)

  // Au montage, la rangée de chips défile (horizontalement seulement) jusqu'à
  // la catégorie du jour mémorisée, sinon elle peut être hors champ sur mobile.
  // Idempotent (StrictMode) ; sans effet si la rangée n'a pas de débordement.
  useEffect(() => {
    const box = chipsRef.current
    const active = box?.querySelector('.fam-chip.active')
    if (!box || !active) return
    // Position de la chip dans la rangée (offsetLeft serait relatif à .app).
    const left = active.getBoundingClientRect().left - box.getBoundingClientRect().left
    box.scrollLeft = Math.max(0, box.scrollLeft + left - 16)
  }, [])

  // Catégories visibles selon la langue (Code de la route masqué hors FR).
  const categories = getCategories(lang)
  const hero = categories.find((c) => c.id === HERO_CATEGORY)
  const others = categories.filter((c) => c.id !== HERO_CATEGORY)
  const visible = (id) => categories.some((c) => c.id === id)

  // Total des questions visibles dans cette langue (accroche sous le titre).
  const totalQuestions = categories.reduce(
    (n, c) => n + countQuestions(c.id, 'facile') + countQuestions(c.id, 'expert'),
    0,
  )

  // L'onglet Panneaux (code de la route) n'existe qu'en français.
  const showPanneaux = lang === 'fr'
  const activeTab = showPanneaux ? tab : 'quiz'

  // Défi du jour : catégorie choisie et résultats déjà joués aujourd'hui.
  const dailyCat =
    (visible(dailyPick) && dailyPick) ||
    (visible(p.dailyCategory) && p.dailyCategory) ||
    (visible(DAILY_DEFAULT[lang]) && DAILY_DEFAULT[lang]) ||
    DAILY_FALLBACK
  const daily = getDailyState()
  const dailyDone = daily.results[dailyCat] || null
  // Chips dans l'ordre des cartes : héros d'abord.
  const dailyCats = hero ? [hero, ...others] : categories

  // Duels récents (section masquée sans historique).
  const duels = getDuels()
    .filter((d) => getCategory(d.cat))
    .slice(0, DUELS_SHOWN)

  function playableCount(catId) {
    const available = countQuestions(catId, difficulty)
    // Solo : toutes les questions dispo. Défi : ce qui est jouable (manches × 5).
    return mode === 'challenge' ? Math.min(available, CHALLENGE_PLAYABLE) : available
  }

  function pickTab(id) {
    sound.select()
    setTabOverride(null)
    onPrefsChange({ tab: id })
  }

  function startCategory(catId) {
    sound.select()
    onStart({ categoryId: catId, mode, difficulty })
  }

  function playDaily() {
    sound.select()
    onPrefsChange({ dailyCategory: dailyCat })
    onDaily(dailyCat)
  }

  return (
    <div className="home">
      <header className="home-head">
        <QMark size={46} />
        <div>
          <h1 className="logo">{t('app_name')}</h1>
          <p className="home-title">{t('app_subtitle')}</p>
        </div>
      </header>
      <p className="home-tagline">
        {t('home_tagline', { n: fmtNumber(totalQuestions), k: categories.length })}
      </p>

      <HomeProgress
        lastCategory={p.lastCategory}
        difficulty={difficulty}
        categories={categories}
        onResume={onStart}
        onPreload={preloadBank}
        onInstall={typeof onInstall === 'function' ? onInstall : null}
      />

      {showPanneaux && (
        <div className="home-tabs" role="tablist">
          {[
            ['quiz', t('home_tab_quiz')],
            ['panneaux', t('home_tab_panneaux')],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={`home-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => pickTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'panneaux' ? (
        <PanneauxRevision
          onStartQuiz={({ mode: quizMode, difficulty: quizDifficulty, imageFamily }) =>
            onStart({
              categoryId: 'panneaux',
              mode: quizMode,
              difficulty: quizDifficulty,
              ...(imageFamily ? { imageFamily } : {}),
            })
          }
          onFlashcards={onFlashcards}
        />
      ) : (
        <>
          <section className="selectors">
            <div className="field">
              <span className="field-label">{t('mode_label')}</span>
              <Segmented
                value={mode}
                onChange={(value) => onPrefsChange({ mode: value })}
                label={t('seg_mode_label')}
                options={[
                  {
                    value: 'solo',
                    label: (
                      <>
                        <IconBook size={15} strokeWidth={2.2} /> {t('mode_solo')}
                      </>
                    ),
                  },
                  {
                    value: 'challenge',
                    label: (
                      <>
                        <IconBolt size={15} strokeWidth={2.2} /> {t('mode_challenge')}
                      </>
                    ),
                  },
                ]}
              />
              <p className="field-help">
                {mode === 'solo' ? t('help_solo') : t('help_challenge')}
              </p>
            </div>

            <div className="field">
              <span className="field-label">{t('difficulty_label')}</span>
              <Segmented
                value={difficulty}
                onChange={(value) => onPrefsChange({ difficulty: value })}
                label={t('seg_diff_label')}
                options={[
                  { value: 'facile', label: t('diff_facile') },
                  { value: 'expert', label: t('diff_expert') },
                ]}
              />
            </div>
          </section>

          <section className="categories">
            {/* Défi du jour : 10 questions identiques pour tout le monde. */}
            <section className="daily-card" aria-label={t('daily_title')}>
              <div className="daily-head">
                <span className="daily-kicker">
                  <IconCalendar size={18} />
                  <span>{t('daily_title')}</span>
                </span>
                <span className="daily-date">{fmtDate(todayKey(), 'long')}</span>
              </div>
              <span className="sr-only" id={catLabelId}>
                {t('home_daily_cat_label')}
              </span>
              <div
                ref={chipsRef}
                className="fam-chips daily-chips"
                role="radiogroup"
                aria-labelledby={catLabelId}
              >
                {dailyCats.map((cat) => {
                  const done = daily.results[cat.id]
                  const checked = cat.id === dailyCat
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      className={`fam-chip ${checked ? 'active' : ''}`}
                      onClick={() => {
                        if (!checked) sound.select()
                        setDailyPick(cat.id)
                      }}
                    >
                      <span>{t(cat.labelKey)}</span>
                      <span className={`daily-chip-state${done ? ' is-done' : ''}`}>
                        {done ? (
                          <>
                            <IconCheck size={12} strokeWidth={2.6} />
                            {`${done.score}/${DAILY_QUESTIONS}`}
                          </>
                        ) : (
                          t('home_daily_todo')
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="daily-sub">{t('home_daily_sub', { n: DAILY_QUESTIONS })}</p>
              <button
                type="button"
                className="btn btn-primary daily-go"
                onClick={playDaily}
                onPointerDown={() => preloadBank(dailyCat)}
                onFocus={() => preloadBank(dailyCat)}
              >
                {dailyDone
                  ? t('home_daily_review', { score: dailyDone.score, total: DAILY_QUESTIONS })
                  : t('home_daily_play')}
              </button>
            </section>

            <span className="field-label">{t('choose_category')}</span>

            {hero && (
              <div className="hero-card">
                <button
                  type="button"
                  className="hero-main"
                  onClick={() => startCategory(hero.id)}
                  onPointerDown={() => preloadBank(hero.id)}
                  onFocus={() => preloadBank(hero.id)}
                >
                  <span className="hero-badge">
                    {t('questions_count', { n: playableCount(hero.id) }).toUpperCase()}
                  </span>
                  <span className="hero-row">
                    <span className="cat-ic" style={{ '--cat': hero.gradient[0] }}>
                      <CatIcon id={hero.id} size={26} />
                    </span>
                    <span className="cat-tx">
                      <span className="hero-name">{t(hero.labelKey)}</span>
                      <span className="hero-sub">{t('hero_sub')}</span>
                    </span>
                    <IconChevronRight className="cat-go" size={20} strokeWidth={2.4} />
                  </span>
                </button>
                <CatMeta cat={hero} difficulty={difficulty} onErrors={onErrors} showErrors={false} />
                <HeroExam onExam={onExam} onErrors={onErrors} />
              </div>
            )}

            <div className="cat-list">
              {others.map((cat) => (
                <div key={cat.id} className="cat-card">
                  <button
                    type="button"
                    className="cat-main"
                    onClick={() => startCategory(cat.id)}
                    onPointerDown={() => preloadBank(cat.id)}
                    onFocus={() => preloadBank(cat.id)}
                  >
                    <span className="cat-ic" style={{ '--cat': cat.gradient[0] }}>
                      <CatIcon id={cat.id} size={22} />
                    </span>
                    <span className="cat-tx">
                      <span className="cat-label">{t(cat.labelKey)}</span>
                      <span className="cat-count">
                        {t('questions_count', { n: playableCount(cat.id) })}
                      </span>
                    </span>
                    <IconChevronRight className="cat-go" size={18} strokeWidth={2.4} />
                  </button>
                  <CatMeta cat={cat} difficulty={difficulty} onErrors={onErrors} />
                </div>
              ))}
            </div>
          </section>

          {duels.length > 0 && (
            <section className="home-duels" aria-labelledby={duelsTitleId}>
              <h2 className="home-section-title" id={duelsTitleId}>
                {t('home_duels_title')}
              </h2>
              <ul className="duel-list">
                {duels.map((d) => {
                  const cat = getCategory(d.cat)
                  const name = d.opponent || t('home_duel_anon')
                  const rounds = d.myScores.length || CHALLENGE_DEFAULT_ROUNDS
                  return (
                    <li key={`${d.seed}:${d.cat}:${d.diff}`} className="duel-item">
                      <span className="cat-ic" style={{ '--cat': cat.gradient[0] }}>
                        <CatIcon id={cat.id} size={18} />
                      </span>
                      <span className="duel-tx">
                        <span className="duel-line">
                          <b>{t('home_duel_vs', { name })}</b>
                          {' · '}
                          {t(cat.labelKey)}
                          {' · '}
                          {d.diff === 'expert' ? t('diff_expert') : t('diff_facile')}
                        </span>
                        <span className="duel-sub">
                          {t('home_duel_points', {
                            me: fmtNumber(sum(d.myScores)),
                            them: fmtNumber(sum(d.theirScores)),
                          })}
                          {' · '}
                          <span className={`duel-status is-${d.status}`}>
                            {t(DUEL_STATUS_KEY[d.status] || DUEL_STATUS_KEY.sent)}
                          </span>
                          {d.date && (
                            <>
                              {' · '}
                              {relativeDay(d.date, locale, fmtDate)}
                            </>
                          )}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="duel-rematch"
                        aria-label={t('home_rematch_aria', { name })}
                        onClick={() => {
                          sound.select()
                          onRematch({
                            categoryId: d.cat,
                            difficulty: d.diff,
                            opponent: d.opponent,
                            rounds,
                          })
                        }}
                        onPointerDown={() => preloadBank(d.cat)}
                      >
                        <IconRefresh size={15} />
                        <span>{t('defi_rematch')}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
