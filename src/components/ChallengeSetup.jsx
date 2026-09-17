import { useState } from 'react'
import { getCategory, getQuestions } from '../content'
import {
  CHALLENGE_DEFAULT_ROUNDS,
  CHALLENGE_QUESTION_COUNT,
  CHALLENGE_ROUND_OPTIONS,
  maxRoundsForBank,
} from '../lib/game'
import { randomSeed } from '../lib/quiz'
import { getPseudo, setPseudo } from '../lib/duels'
import { track } from '../lib/analytics'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import { CatIcon } from './icons'
import Segmented from './Segmented'
import '../styles/defi.css'

// Saisie du pseudo + choix du nombre de manches (joueur 1) avant un Défi.
//
// Props :
//   categoryId, difficulty, onStart(config), onCancel()
//   opponent : pseudo de l'adversaire d'une REVANCHE (facultatif). Il est
//              affiché en bandeau et mémorisé dans l'historique des duels
//              (config.rival) quand le lien est partagé.
//   rematch  : { rounds } valeurs pré-remplies (facultatif). La graine est
//              toujours nouvelle : une revanche = de nouvelles questions.
//
// Le mode « simulate » (adversaire simulé) n'est plus qu'un lien discret sous
// le bouton principal : le vrai jeu, c'est le lien envoyé à un pote.
export default function ChallengeSetup({
  categoryId,
  difficulty,
  onStart,
  onCancel,
  opponent = null,
  rematch = null,
}) {
  const { t } = useI18n()
  const category = getCategory(categoryId)

  // Manches jouables selon la banque (≥ 40 questions ⇒ jusqu'à 8 manches).
  const bankSize = category ? getQuestions(categoryId, difficulty).length : 0
  const maxRounds = maxRoundsForBank(bankSize)
  const roundChoices = CHALLENGE_ROUND_OPTIONS.filter((n) => n <= maxRounds)
  const canPlay = bankSize >= CHALLENGE_QUESTION_COUNT && roundChoices.length > 0

  // Pseudo mémorisé (clé quizz_pseudo) : on ne le redemande pas à chaque défi.
  const [name, setName] = useState(getPseudo)
  const [rounds, setRounds] = useState(() => {
    const wanted = rematch?.rounds
    if (roundChoices.includes(wanted)) return wanted
    if (roundChoices.includes(CHALLENGE_DEFAULT_ROUNDS)) return CHALLENGE_DEFAULT_ROUNDS
    return roundChoices[roundChoices.length - 1] || 1
  })
  const pseudo = name.trim() || t('default_host')

  function launch(mode) {
    if (!canPlay) return
    sound.select()
    setPseudo(name)
    if (mode === 'host') track('defi_create', categoryId)
    onStart({
      categoryId,
      difficulty,
      seed: randomSeed(),
      mode,
      myName: pseudo,
      rounds,
      opponent: null,
      rival: opponent || null,
    })
  }

  if (!category) {
    return (
      <div className="quiz">
        <div className="defi-notice">
          <h2 className="defi-notice-title">{t('invite_invalid')}</h2>
          <button type="button" className="btn btn-primary" onClick={onCancel}>
            {t('home')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="quiz">
      <div className="quiz-topbar">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          {t('back')}
        </button>
      </div>

      <div className="setup-card" style={{ '--cat': category.gradient[0] }}>
        <span className="hero-cat">
          <CatIcon id={category.id} size={14} strokeWidth={2.2} />{' '}
          {t(category.labelKey)} · {t(`diff_${difficulty}`)}
        </span>
        <h2 className="setup-title">
          {opponent ? t('defi_rematch_vs', { name: opponent }) : t('challenge_title')}
        </h2>
        <p className="setup-sub">
          {opponent ? t('defi_rematch_sub', { name: opponent }) : t('setup_sub')}
        </p>
        {opponent && <span className="defi-rival">⚔️ {opponent}</span>}
      </div>

      {!canPlay && (
        <div className="defi-notice">
          <p className="defi-notice-text">
            {t('defi_bank_too_small')}
          </p>
        </div>
      )}

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

      {canPlay && (
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
      )}

      <div className="result-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canPlay}
          onClick={() => launch('host')}
        >
          {t('launch_challenge')}
        </button>
        <button
          type="button"
          className="link-btn"
          disabled={!canPlay}
          onClick={() => launch('simulate')}
        >
          {t('defi_test_alone')}
        </button>
      </div>
    </div>
  )
}
