import { useId } from 'react'
import { getProgress, getStats, getStreak } from '../lib/stats'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import { IconFlame, IconInstall, IconRefresh, IconTarget, IconTrophy } from './icons'

// Bloc « Ta progression » de l'accueil. Tout est lu de façon synchrone dans
// localStorage (stats.js) : aucune banque de questions n'est chargée.
//
// Avant la première partie : une ligne d'accroche (et « Installer l'app » si
// le shell le propose). Ensuite : série de jours 🔥, total de bonnes réponses,
// record de série, rappel « joue aujourd'hui », et « Reprendre » vers la
// dernière catégorie jouée (prefs.lastCategory) au niveau courant, avec sa
// jauge de couverture (questions vues / banque).
//
// Props :
//   lastCategory : id de la dernière catégorie jouée (ou null)
//   difficulty   : 'facile' | 'expert' (niveau courant des préférences)
//   categories   : catégories visibles dans la langue (getCategories(lang))
//   onResume({ categoryId, mode:'solo', difficulty })
//   onPreload(categoryId) : préchauffe la banque (pointerdown / focus)
//   onInstall : fonction (bouton affiché) ou null
export default function HomeProgress({
  lastCategory,
  difficulty,
  categories,
  onResume,
  onPreload,
  onInstall,
}) {
  const { t, tn } = useI18n()
  const titleId = useId()
  const stats = getStats()
  const streak = getStreak()
  const played = stats.total.answered > 0

  const install =
    typeof onInstall === 'function' ? (
      <button
        type="button"
        className="progress-install"
        onClick={() => {
          sound.select()
          onInstall()
        }}
      >
        <IconInstall size={16} />
        <span>{t('home_install')}</span>
      </button>
    ) : null

  if (!played) {
    return (
      <section className="home-progress is-empty" aria-label={t('home_progress_title')}>
        <p className="progress-empty">{t('home_progress_empty')}</p>
        {install}
      </section>
    )
  }

  // Dernière catégorie jouée, si elle est visible dans la langue courante.
  const last = categories.find((c) => c.id === lastCategory) || null
  const progress = last ? getProgress(last.id, difficulty) : null
  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.seen / progress.total) * 100))
      : 0

  // Série vivante mais pas encore jouée aujourd'hui : rappel ; série à zéro :
  // invitation à en lancer une.
  let hint = null
  if (!streak.playedToday) {
    hint = streak.current > 0 ? t('home_streak_keep') : t('home_streak_start')
  }

  return (
    <section className="home-progress" aria-labelledby={titleId}>
      <h2 className="home-section-title" id={titleId}>
        {t('home_progress_title')}
      </h2>
      <div className="progress-chips">
        <span className="progress-chip is-streak">
          <IconFlame size={16} />
          <span>{tn('streak_days', streak.current)}</span>
        </span>
        <span className="progress-chip is-target">
          <IconTarget size={16} />
          <span>{tn('home_correct_total', stats.total.correct)}</span>
        </span>
        {streak.best > streak.current && (
          <span className="progress-chip is-best">
            <IconTrophy size={14} />
            <span>{tn('home_streak_best', streak.best)}</span>
          </span>
        )}
      </div>
      {hint && <p className="progress-hint">{hint}</p>}
      {(last || install) && (
        <div className="progress-actions">
          {last && (
            <button
              type="button"
              className="progress-resume"
              onClick={() => {
                sound.select()
                onResume({ categoryId: last.id, mode: 'solo', difficulty })
              }}
              onPointerDown={() => onPreload?.(last.id)}
              onFocus={() => onPreload?.(last.id)}
            >
              <span className="progress-resume-head">
                <IconRefresh size={16} />
                <span>{t('home_resume')}</span>
              </span>
              <span className="progress-resume-sub">
                {t('home_resume_sub', {
                  cat: t(last.labelKey),
                  level: t(`diff_${difficulty}`),
                })}
                {' · '}
                {t('home_cover', { pct })}
              </span>
              <span className="cat-gauge" aria-hidden="true">
                <span
                  className="cat-gauge-fill"
                  style={{ '--fill': pct / 100, '--cat': last.gradient[0] }}
                />
              </span>
            </button>
          )}
          {install}
        </div>
      )}
    </section>
  )
}
