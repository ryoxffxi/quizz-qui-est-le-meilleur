// Écrans chargés PARESSEUSEMENT (un chunk par écran, hors du bundle d'accueil)
// et préchargement à la demande.
//
//   getScreen(name)     → composant React.lazy (identité stable entre rendus)
//   preloadScreen(name) → Promise du module (idempotente) ; à appeler au
//                         pointerdown/focus d'une carte de l'accueil pour que
//                         le chunk soit déjà là au clic (Home, chantier shell-home)
//   resetScreen(name)   → oublie un chargement raté pour permettre « Réessayer »
//                         (React.lazy garde sinon l'échec pour toujours)
//
// Noms : solo | errors (même chunk que solo) | challenge | challengeSetup |
//        invite | result | exam | daily | flashcards | modals
import { lazy } from 'react'

const LOADERS = {
  solo: () => import('../components/SoloQuiz.jsx'),
  errors: () => import('../components/SoloQuiz.jsx'),
  challenge: () => import('../components/ChallengeQuiz.jsx'),
  challengeSetup: () => import('../components/ChallengeSetup.jsx'),
  invite: () => import('../components/ChallengeInvite.jsx'),
  result: () => import('../components/ChallengeResultView.jsx'),
  exam: () => import('../components/ExamQuiz.jsx'),
  daily: () => import('../components/DailyQuiz.jsx'),
  flashcards: () => import('../components/Flashcards.jsx'),
  modals: () => import('../components/Modals.jsx'),
}

export const SCREEN_NAMES = Object.freeze(Object.keys(LOADERS))

const pending = new Map() // nom → Promise du module
const lazies = new Map() // nom → composant lazy

export function preloadScreen(name) {
  const load = LOADERS[name]
  if (!load) return Promise.resolve(null)
  if (!pending.has(name)) {
    const p = load().catch((error) => {
      pending.delete(name) // un nouvel appel retentera
      throw error
    })
    pending.set(name, p)
  }
  return pending.get(name)
}

export function getScreen(name) {
  if (!LOADERS[name]) throw new Error(`écran inconnu : ${name}`)
  if (!lazies.has(name)) lazies.set(name, lazy(() => preloadScreen(name)))
  return lazies.get(name)
}

export function resetScreen(name) {
  pending.delete(name)
  lazies.delete(name)
}
