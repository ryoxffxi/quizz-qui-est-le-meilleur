import { useState } from 'react'
import SignImage from './SignImage'
import { useI18n } from '../i18n'
import '../styles/solo.css'

// Récapitulatif des erreurs, partagé par tous les modes (Solo, Défi, Examen,
// Quotidien). Repliable : déplié par défaut (on apprend de ses erreurs), mais
// masquable d'un clic, utile pour qui préfère ne pas exposer ses fautes avant
// de partager.
//
// Forme canonique d'une erreur : { question, chosen } où `question` est la
// question LOCALISÉE (id, question, options, correct, explanation, image?,
// optionImages?) et `chosen` l'index choisi (null = pas de réponse).
// La forme aplatie du contrat est aussi acceptée :
// { question:string, options?, chosen:string, correct:string, explanation, image?, optionImages? }.
function normalize(m, i) {
  if (m && m.question && typeof m.question === 'object') {
    const q = m.question
    const opts = q.options || []
    const answered = m.chosen != null
    return {
      key: q.id ?? i,
      text: q.question,
      image: q.image,
      explanation: q.explanation,
      answered,
      isWrong: !answered || m.chosen !== q.correct,
      chosen: answered ? opts[m.chosen] : null,
      chosenImg: answered ? q.optionImages?.[m.chosen] : null,
      correct: opts[q.correct],
      correctImg: q.optionImages?.[q.correct],
    }
  }
  const opts = m?.options || []
  const answered = m?.chosen != null
  return {
    key: m?.id ?? i,
    text: m?.question,
    image: m?.image,
    explanation: m?.explanation,
    answered,
    isWrong: !answered || m.chosen !== m.correct,
    chosen: answered ? m.chosen : null,
    chosenImg: answered ? m.optionImages?.[opts.indexOf(m.chosen)] : null,
    correct: m?.correct,
    correctImg: m?.optionImages?.[opts.indexOf(m?.correct)],
  }
}

// Réponse (nom + mini image de panneau quand l'option est visuelle).
function Answer({ text, image }) {
  return (
    <>
      {image && <SignImage id={image} className="recap-mini-sign" />}
      {text}
    </>
  )
}

export default function ErrorRecap({ mistakes, title, defaultOpen = true }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(defaultOpen)

  if (!mistakes || mistakes.length === 0) {
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
        <span className="recap-title">{title || t('recap_title', { n: mistakes.length })}</span>
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
          {mistakes.map((m, i) => {
            const e = normalize(m, i)
            return (
              <div key={e.key} className="recap-item">
                <div className="recap-head">
                  {e.image && <SignImage id={e.image} className="recap-sign" />}
                  <p className="recap-q">{e.text}</p>
                </div>
                {e.answered && e.isWrong && (
                  <p className="recap-line bad">
                    {t('recap_your_answer', { ans: '' })}
                    <Answer text={e.chosen} image={e.chosenImg} />
                  </p>
                )}
                {!e.answered && <p className="recap-line bad">{t('recap_no_answer')}</p>}
                <p className="recap-line good">
                  {t('recap_correct_answer', { ans: '' })}
                  <Answer text={e.correct} image={e.correctImg} />
                </p>
                {e.explanation && <p className="recap-exp">{e.explanation}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
