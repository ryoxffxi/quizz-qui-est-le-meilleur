import { useState } from 'react'
import { useI18n } from '../i18n'

// Récapitulatif des erreurs, partagé par les modes Solo et Défi.
// Repliable : déplié par défaut (on apprend de ses erreurs), mais masquable d'un
// clic — utile pour qui préfère ne pas exposer ses fautes avant de partager.
// Les questions reçues sont déjà localisées (champs en chaînes simples).
export default function ErrorRecap({ mistakes }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(true)

  if (mistakes.length === 0) {
    return <p className="recap-perfect">{t('recap_perfect')}</p>
  }

  return (
    <div className="recap">
      <button
        type="button"
        className={`recap-toggle ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="recap-title">{t('recap_title', { n: mistakes.length })}</span>
        <svg
          className="recap-chevron"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="recap-list">
          {mistakes.map(({ question, chosen }) => (
            <div key={question.id} className="recap-item">
              <p className="recap-q">{question.question}</p>
              {chosen != null && chosen !== question.correct && (
                <p className="recap-line bad">
                  {t('recap_your_answer', { ans: question.options[chosen] })}
                </p>
              )}
              {chosen == null && (
                <p className="recap-line bad">{t('recap_no_answer')}</p>
              )}
              <p className="recap-line good">
                {t('recap_correct_answer', { ans: question.options[question.correct] })}
              </p>
              <p className="recap-exp">{question.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
