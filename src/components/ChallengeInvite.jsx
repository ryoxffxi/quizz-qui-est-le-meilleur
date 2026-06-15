import { useState } from 'react'
import { getCategory, getQuestions } from '../content'
import {
  CHALLENGE_DEFAULT_ROUNDS,
  CHALLENGE_QUESTION_COUNT,
  DIFFICULTIES,
  maxRoundsForBank,
} from '../lib/game'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'

// Écran d'accueil quand un ami ouvre un lien de défi.
// invite = { p: pseudo J1, c, d, s, n, r: [scores], l: langue }
export default function ChallengeInvite({ invite, onStart, onCancel }) {
  const { t } = useI18n()
  const category = getCategory(invite.c)
  const [name, setName] = useState('')
  const pseudo = name.trim() || t('default_join')
  const host = invite.p || t('default_friend')

  if (!category || !DIFFICULTIES[invite.d]) {
    return (
      <div className="quiz">
        <div className="result-card">
          <h2 className="result-title">{t('invite_invalid')}</h2>
          <button className="btn btn-primary" onClick={onCancel}>
            {t('home')}
          </button>
        </div>
      </div>
    )
  }

  // Nombre de manches imposé par le lien (borné par la banque).
  const maxRounds = maxRoundsForBank(getQuestions(invite.c, invite.d).length)
  const rounds = Math.min(
    invite.n || invite.r?.length || CHALLENGE_DEFAULT_ROUNDS,
    maxRounds,
  )
  const roundsLabel = t(rounds === 1 ? 'rounds_count_one' : 'rounds_count', {
    n: rounds,
  })

  function accept() {
    sound.select()
    onStart({
      categoryId: invite.c,
      difficulty: invite.d,
      seed: invite.s,
      mode: 'join',
      myName: pseudo,
      rounds,
      opponent: { name: host, roundScores: invite.r || [] },
    })
  }

  return (
    <div className="quiz">
      <div
        className="setup-card"
        style={{
          background: `linear-gradient(160deg, ${category.gradient[0]}, ${category.gradient[1]})`,
        }}
      >
        <span className="hero-cat">
          {category.emoji} {t(category.labelKey)} · {t(`diff_${invite.d}`)}
        </span>
        <h2 className="setup-title">{t('invite_title', { host })}</h2>
        <p className="setup-sub">
          {t('invite_sub', {
            cat: t(category.labelKey),
            rounds: roundsLabel,
            q: rounds * CHALLENGE_QUESTION_COUNT,
          })}
        </p>
      </div>

      <label className="setup-field">
        <span className="field-label">{t('pseudo_label')}</span>
        <input
          className="text-input"
          type="text"
          value={name}
          maxLength={20}
          placeholder={t('pseudo_ph_join')}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && accept()}
        />
      </label>

      <div className="result-actions">
        <button type="button" className="btn btn-primary" onClick={accept}>
          {t('accept_challenge')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {t('home')}
        </button>
      </div>
    </div>
  )
}
