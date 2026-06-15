import { useState } from 'react'
import Segmented from './Segmented'
import { countQuestions, getCategories } from '../content'
import { CHALLENGE_MAX_ROUNDS, CHALLENGE_QUESTION_COUNT } from '../lib/game'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'

const CHALLENGE_PLAYABLE = CHALLENGE_MAX_ROUNDS * CHALLENGE_QUESTION_COUNT

export default function Home({ onStart }) {
  const { t, lang } = useI18n()
  const [mode, setMode] = useState('solo')
  const [difficulty, setDifficulty] = useState('facile')

  // Catégories visibles selon la langue (Code de la route masqué hors FR).
  const categories = getCategories(lang)

  return (
    <div className="home">
      <header className="home-head">
        <h1 className="logo">ryo.offc</h1>
        <p className="tagline">{t('tagline')}</p>
      </header>

      <section className="selectors">
        <div className="field">
          <span className="field-label">{t('mode_label')}</span>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'solo', label: t('mode_solo') },
              { value: 'challenge', label: t('mode_challenge') },
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
            accent={difficulty === 'expert' ? 'var(--danger)' : 'var(--accent)'}
            options={[
              { value: 'facile', label: t('diff_facile') },
              { value: 'expert', label: t('diff_expert') },
            ]}
          />
        </div>
      </section>

      <section className="categories">
        <span className="field-label">{t('choose_category')}</span>
        <div className="cat-grid">
          {categories.map((cat) => {
            const available = countQuestions(cat.id, difficulty)
            // Solo : toutes les questions dispo. Défi : ce qui est jouable (manches × 5).
            const count =
              mode === 'challenge'
                ? Math.min(available, CHALLENGE_PLAYABLE)
                : available
            return (
              <button
                key={cat.id}
                type="button"
                className="cat-card"
                style={{
                  background: `linear-gradient(135deg, ${cat.gradient[0]}, ${cat.gradient[1]})`,
                }}
                onClick={() => {
                  sound.select()
                  onStart({ categoryId: cat.id, mode, difficulty })
                }}
              >
                <span className="cat-emoji">{cat.emoji}</span>
                <span className="cat-label">{t(cat.labelKey)}</span>
                <span className="cat-count">{t('questions_count', { n: count })}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
