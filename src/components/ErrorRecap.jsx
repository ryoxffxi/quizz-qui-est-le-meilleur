import { useI18n } from '../i18n'

// Récapitulatif des erreurs, partagé par les modes Solo et Défi.
// Les questions reçues sont déjà localisées (champs en chaînes simples).
export default function ErrorRecap({ mistakes }) {
  const { t } = useI18n()

  if (mistakes.length === 0) {
    return <p className="recap-perfect">{t('recap_perfect')}</p>
  }

  return (
    <div className="recap">
      <h3 className="recap-title">{t('recap_title', { n: mistakes.length })}</h3>
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
  )
}
