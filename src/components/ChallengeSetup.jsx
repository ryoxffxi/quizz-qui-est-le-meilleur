import { useState } from 'react'
import { getCategory, getQuestions } from '../content'
import {
  CHALLENGE_DEFAULT_ROUNDS,
  CHALLENGE_QUESTION_COUNT,
  CHALLENGE_ROUND_OPTIONS,
  maxRoundsForBank,
} from '../lib/game'
import { randomSeed } from '../lib/quiz'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import Segmented from './Segmented'

// Saisie du pseudo + choix du nombre de manches (joueur 1) avant un Défi.
export default function ChallengeSetup({
  categoryId,
  difficulty,
  onStart,
  onCancel,
}) {
  const { t } = useI18n()
  const category = getCategory(categoryId)

  // Manches jouables selon la banque (≥ 40 questions ⇒ jusqu'à 8 manches).
  const bankSize = getQuestions(categoryId, difficulty).length
  const maxRounds = maxRoundsForBank(bankSize)
  const roundChoices = CHALLENGE_ROUND_OPTIONS.filter((n) => n <= maxRounds)

  const [name, setName] = useState('')
  const [rounds, setRounds] = useState(
    roundChoices.includes(CHALLENGE_DEFAULT_ROUNDS)
      ? CHALLENGE_DEFAULT_ROUNDS
      : roundChoices[roundChoices.length - 1],
  )
  const pseudo = name.trim() || t('default_host')

  function launch(mode) {
    sound.select()
    onStart({
      categoryId,
      difficulty,
      seed: randomSeed(),
      mode,
      myName: pseudo,
      rounds,
      opponent: null,
    })
  }

  return (
    <div className="quiz">
      <div className="quiz-topbar">
        <button className="btn-ghost" onClick={onCancel}>
          {t('back')}
        </button>
      </div>

      <div
        className="setup-card"
        style={{
          background: `linear-gradient(160deg, ${category.gradient[0]}, ${category.gradient[1]})`,
        }}
      >
        <span className="hero-cat">
          {category.emoji} {t(category.labelKey)} · {t(`diff_${difficulty}`)}
        </span>
        <h2 className="setup-title">{t('challenge_title')}</h2>
        <p className="setup-sub">{t('setup_sub')}</p>
      </div>

      <label className="setup-field">
        <span className="field-label">{t('pseudo_label')}</span>
        <input
          className="text-input"
          type="text"
          value={name}
          maxLength={20}
          placeholder={t('pseudo_ph_host')}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && launch('host')}
        />
      </label>

      <div className="setup-field">
        <span className="field-label">{t('rounds_label')}</span>
        <Segmented
          value={rounds}
          onChange={setRounds}
          options={roundChoices.map((n) => ({ value: n, label: String(n) }))}
        />
        <span className="field-help">
          {t(rounds === 1 ? 'rounds_help_one' : 'rounds_help', {
            n: rounds,
            q: rounds * CHALLENGE_QUESTION_COUNT,
          })}
        </span>
      </div>

      <div className="result-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => launch('host')}
        >
          {t('launch_challenge')}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => launch('simulate')}
        >
          {t('simulate_friend')}
        </button>
      </div>
    </div>
  )
}
