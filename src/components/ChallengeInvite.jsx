import { useEffect, useRef, useState } from 'react'
import { getCategory, getQuestions } from '../content'
import {
  CHALLENGE_DEFAULT_ROUNDS,
  CHALLENGE_QUESTION_COUNT,
  DIFFICULTIES,
  maxRoundsForBank,
} from '../lib/game'
import { getPseudo, setPseudo } from '../lib/duels'
import { track } from '../lib/analytics'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import { CatIcon } from './icons'
import '../styles/defi.css'

// Écran d'accueil quand un pote ouvre un lien de défi.
// invite = { p: pseudo de l'hôte, c, d, s, n, r: [scores par manche], l }
export default function ChallengeInvite({ invite, onStart, onCancel }) {
  const { t } = useI18n()
  const category = getCategory(invite.c)
  const valid = !!category && !!DIFFICULTIES[invite.d]
  // Pseudo mémorisé (clé quizz_pseudo), comme pour l'hôte.
  const [name, setName] = useState(getPseudo)
  const pseudo = name.trim() || t('default_join')
  const host = invite.p || t('default_friend')

  // Banque trop petite (catégorie récente, langue partielle) : pas de partie.
  const bankSize = valid ? getQuestions(invite.c, invite.d).length : 0
  const canPlay = bankSize >= CHALLENGE_QUESTION_COUNT

  // Ouverture d'un lien de défi : une mesure par montage (StrictMode compris).
  const trackedRef = useRef(false)
  useEffect(() => {
    if (trackedRef.current || !valid) return
    trackedRef.current = true
    track('defi_open', invite.c)
  }, [valid, invite.c])

  if (!valid) {
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

  // Nombre de manches imposé par le lien (borné par la banque).
  const maxRounds = maxRoundsForBank(bankSize)
  const rounds = Math.max(
    1,
    Math.min(invite.n || invite.r?.length || CHALLENGE_DEFAULT_ROUNDS, maxRounds),
  )
  const roundsLabel = t(rounds === 1 ? 'rounds_count_one' : 'rounds_count', { n: rounds })
  const hostScores = Array.isArray(invite.r) ? invite.r : []
  const hostTotal = hostScores.reduce((a, b) => a + b, 0)

  function accept() {
    if (!canPlay) return
    sound.select()
    setPseudo(name)
    onStart({
      categoryId: invite.c,
      difficulty: invite.d,
      seed: invite.s,
      mode: 'join',
      myName: pseudo,
      rounds,
      opponent: { name: host, roundScores: hostScores },
    })
  }

  return (
    <div className="quiz">
      <div className="setup-card" style={{ '--cat': category.gradient[0] }}>
        <span className="hero-cat">
          <CatIcon id={category.id} size={14} strokeWidth={2.2} />{' '}
          {t(category.labelKey)} · {t(`diff_${invite.d}`)}
        </span>
        <h2 className="setup-title">{t('invite_title', { host })}</h2>
        <p className="setup-sub">
          {t('invite_sub', {
            cat: t(category.labelKey),
            rounds: roundsLabel,
            q: rounds * CHALLENGE_QUESTION_COUNT,
          })}
        </p>
        {hostScores.length > 0 && (
          <p className="defi-host-points">{t('defi_host_points', { host, total: hostTotal })}</p>
        )}
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
          placeholder={t('pseudo_ph_join')}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && accept()}
        />
      </label>

      <div className="result-actions">
        <button type="button" className="btn btn-primary" disabled={!canPlay} onClick={accept}>
          {t('accept_challenge')}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {t('home')}
        </button>
      </div>
    </div>
  )
}
