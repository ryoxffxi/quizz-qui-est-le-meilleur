import { useState } from 'react'
import Segmented from './Segmented'
import PanneauxRevision from './PanneauxRevision'
import { countQuestions, getCategories } from '../content'
import { CHALLENGE_MAX_ROUNDS, CHALLENGE_QUESTION_COUNT } from '../lib/game'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import { QMark, CatIcon, IconChevronRight, IconBook, IconBolt } from './icons'

const CHALLENGE_PLAYABLE = CHALLENGE_MAX_ROUNDS * CHALLENGE_QUESTION_COUNT

// Catégorie mise en avant en tête de liste (carte « héros »).
const HERO_CATEGORY = 'code-route'

export default function Home({ onStart }) {
  const { t, lang } = useI18n()
  const [tab, setTab] = useState('quiz')
  const [mode, setMode] = useState('solo')
  const [difficulty, setDifficulty] = useState('facile')

  // Catégories visibles selon la langue (Code de la route masqué hors FR).
  const categories = getCategories(lang)
  const hero = categories.find((c) => c.id === HERO_CATEGORY)
  const others = categories.filter((c) => c.id !== HERO_CATEGORY)

  // L'onglet Panneaux (code de la route) n'existe qu'en français.
  const showPanneaux = lang === 'fr'
  const activeTab = showPanneaux ? tab : 'quiz'

  function playableCount(catId) {
    const available = countQuestions(catId, difficulty)
    // Solo : toutes les questions dispo. Défi : ce qui est jouable (manches × 5).
    return mode === 'challenge' ? Math.min(available, CHALLENGE_PLAYABLE) : available
  }

  function startCategory(catId) {
    sound.select()
    onStart({ categoryId: catId, mode, difficulty })
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
              onClick={() => {
                sound.select()
                setTab(id)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'panneaux' ? (
        <PanneauxRevision
          onStartQuiz={({ mode: quizMode, difficulty: quizDifficulty }) =>
            onStart({
              categoryId: 'panneaux',
              mode: quizMode,
              difficulty: quizDifficulty,
            })
          }
        />
      ) : (
        <>
          <section className="selectors">
            <div className="field">
              <span className="field-label">{t('mode_label')}</span>
              <Segmented
                value={mode}
                onChange={setMode}
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
                onChange={setDifficulty}
                options={[
                  { value: 'facile', label: t('diff_facile') },
                  { value: 'expert', label: t('diff_expert') },
                ]}
              />
            </div>
          </section>

          <section className="categories">
            <span className="field-label">{t('choose_category')}</span>

            {hero && (
              <button
                type="button"
                className="hero-card"
                onClick={() => startCategory(hero.id)}
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
            )}

            <div className="cat-list">
              {others.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className="cat-card"
                  onClick={() => startCategory(cat.id)}
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
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
