import { useEffect, useState } from 'react'
import { getCategory, isBankReady, loadBank } from '../content'
import { useI18n } from '../i18n'
import '../styles/app.css'

// Visuel d'attente commun (BankGate, Suspense des écrans paresseux).
export function GateSpinner({ text }) {
  return (
    <div className="bank-gate">
      <span className="bank-gate-spinner" aria-hidden="true" />
      {text && <p className="bank-gate-text">{text}</p>}
    </div>
  )
}

// Garde les écrans qui lisent des questions : la banque de la catégorie est
// chargée (chunk séparé) AVANT que l'enfant soit monté.
//
// Pourquoi une garde plutôt que de rendre chaque écran asynchrone : SoloQuiz,
// ChallengeQuiz, ChallengeSetup et ChallengeInvite lisent la banque de façon
// synchrone dès leur premier rendu (tirage du lot, taille de banque). Les
// garder synchrones évite d'éparpiller des états de chargement dans le jeu.
//
// Cas déjà chargé : on rend l'enfant TOUT DE SUITE, sans état de chargement :
// pas de clignotement en revenant sur une catégorie déjà jouée.
//
// `onHome` (facultatif) : bouton Accueil sur les écrans d'erreur ; une
// catégorie inconnue (lien forgé ou périmé) affiche « lien invalide » sans
// bouton Réessayer, puisque réessayer ne changerait rien.
export default function BankGate({ categoryId, onHome, children }) {
  const { t } = useI18n()
  const known = !!getCategory(categoryId)
  const [status, setStatus] = useState(() =>
    isBankReady(categoryId) ? 'ready' : 'loading',
  )
  const [attempt, setAttempt] = useState(0)

  // Changement de catégorie : on réajuste l'état PENDANT le rendu (pattern
  // React officiel) plutôt que dans un effet, ce qui éviterait un rendu de
  // trop, et permet de rendre l'enfant sans attendre si la banque est déjà là.
  const [shownCategory, setShownCategory] = useState(categoryId)
  if (shownCategory !== categoryId) {
    setShownCategory(categoryId)
    setStatus(isBankReady(categoryId) ? 'ready' : 'loading')
  }

  useEffect(() => {
    if (!known || isBankReady(categoryId)) return
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
  }, [categoryId, attempt, known])

  // Retour du réseau pendant l'écran d'erreur : on retente tout seul.
  useEffect(() => {
    if (status !== 'error') return
    const retry = () => {
      setStatus('loading')
      setAttempt((n) => n + 1)
    }
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [status])

  if (!known) {
    return (
      <div className="bank-gate" role="alert">
        <p className="bank-gate-error">{t('app_bank_invalid')}</p>
        {onHome && (
          <button type="button" className="btn btn-primary" onClick={onHome}>
            {t('home')}
          </button>
        )}
      </div>
    )
  }

  if (status === 'ready') return children

  if (status === 'error') {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    return (
      <div className="bank-gate" role="alert">
        <p className="bank-gate-error">{offline ? t('app_offline') : t('bank_error')}</p>
        <div className="bank-gate-actions">
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
          {onHome && (
            <button type="button" className="btn btn-secondary" onClick={onHome}>
              {t('home')}
            </button>
          )}
        </div>
      </div>
    )
  }

  return <GateSpinner text={t('bank_loading')} />
}
