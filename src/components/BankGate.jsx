import { useEffect, useState } from 'react'
import { isBankReady, loadBank } from '../content'
import { useI18n } from '../i18n'

// Garde les écrans qui lisent des questions : la banque de la catégorie est
// chargée (chunk séparé) AVANT que l'enfant soit monté.
//
// Pourquoi une garde plutôt que de rendre chaque écran asynchrone : SoloQuiz,
// ChallengeQuiz, ChallengeSetup et ChallengeInvite lisent la banque de façon
// synchrone dès leur premier rendu (tirage du lot, taille de banque). Les
// garder synchrones évite d'éparpiller des états de chargement dans le jeu.
//
// Cas déjà chargé : on rend l'enfant TOUT DE SUITE, sans état de chargement —
// pas de clignotement en revenant sur une catégorie déjà jouée.
export default function BankGate({ categoryId, children }) {
  const { t } = useI18n()
  const [status, setStatus] = useState(() =>
    isBankReady(categoryId) ? 'ready' : 'loading',
  )
  const [attempt, setAttempt] = useState(0)

  // Changement de catégorie : on réajuste l'état PENDANT le rendu (pattern
  // React officiel) plutôt que dans un effet, ce qui éviterait un rendu de
  // trop — et permet de rendre l'enfant sans attendre si la banque est déjà là.
  const [shownCategory, setShownCategory] = useState(categoryId)
  if (shownCategory !== categoryId) {
    setShownCategory(categoryId)
    setStatus(isBankReady(categoryId) ? 'ready' : 'loading')
  }

  useEffect(() => {
    if (isBankReady(categoryId)) return
    let cancelled = false
    loadBank(categoryId).then(
      () => {
        if (!cancelled) setStatus('ready')
      },
      () => {
        if (!cancelled) setStatus('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [categoryId, attempt])

  if (status === 'ready') return children

  if (status === 'error') {
    return (
      <div className="bank-gate">
        <p className="bank-gate-error">{t('bank_error')}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setStatus('loading')
            setAttempt((n) => n + 1) // relance l'effet de chargement
          }}
        >
          {t('bank_retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="bank-gate">
      <span className="bank-gate-spinner" aria-hidden="true" />
      <p className="bank-gate-text">{t('bank_loading')}</p>
    </div>
  )
}
