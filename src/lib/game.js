// Réglages de jeu et calcul du score, regroupés au même endroit.

export const DIFFICULTIES = {
  facile: {
    id: 'facile',
    timePerQuestion: 10, // secondes par question en mode Défi
    basePoints: 1000, // points de base par bonne réponse
  },
  expert: {
    id: 'expert',
    timePerQuestion: 7, // chronomètre plus court
    basePoints: 1500, // mais des points plus élevés
  },
}

export const CHALLENGE_QUESTION_COUNT = 5 // questions par manche
export const CHALLENGE_MAX_ROUNDS = 8 // plafond absolu : 8 manches × 5 = 40 questions
export const CHALLENGE_ROUND_OPTIONS = [1, 3, 5, 8] // choix proposés
export const CHALLENGE_DEFAULT_ROUNDS = 3 // valeur par défaut
export const SOLO_BATCH_SIZE = 10 // questions par lot en mode Solo
// Lots joués avant d'afficher un bilan de session (ce n'est plus un plafond :
// on peut continuer tant qu'il reste des questions non vues).
export const SOLO_MAX_BATCHES = 4

// Examen blanc (code de la route) : 40 questions, 35 pour être reçu, 20 s par
// question, dont 8 questions de panneaux. Un joueur est « prêt » quand ses
// 3 derniers examens font en moyenne au moins 37/40.
export const EXAM_QUESTIONS = 40
export const EXAM_PASS = 35
export const EXAM_TIME_PER_QUESTION = 20
export const EXAM_SIGN_QUESTIONS = 8
export const EXAM_READY_SCORE = 37

export const DAILY_QUESTIONS = 10 // quiz quotidien
export const ERRORS_BATCH_SIZE = 10 // questions par lot en mode « Mes erreurs »

// Palier de réussite d'un score : genius (100 %), great (80 % et plus),
// good (60 % et plus), meh (40 % et plus), bad (le reste). Partagé par la
// personnalité affichée, la citation de fin et les classes CSS de l'écran de
// résultat. Sans total (0), on est au palier bas.
export const TIERS = ['genius', 'great', 'good', 'meh', 'bad']

export function tierOf(correct, total) {
  if (!(total > 0)) return 'bad'
  const p = (correct / total) * 100
  if (p >= 100) return 'genius'
  if (p >= 80) return 'great'
  if (p >= 60) return 'good'
  if (p >= 40) return 'meh'
  return 'bad'
}

// Clé i18n de personnalité selon le score (rendue par t() côté appelant) :
// personality_genius | personality_great | personality_good | personality_meh
// | personality_bad.
export function personalityKey(correct, total) {
  return `personality_${tierOf(correct, total)}`
}

// Nombre de manches réellement jouables selon la taille de la banque
// (chaque question n'apparaît qu'une fois → au plus banque ÷ 5 manches).
export function maxRoundsForBank(bankSize) {
  return Math.min(CHALLENGE_MAX_ROUNDS, Math.floor(bankSize / CHALLENGE_QUESTION_COUNT))
}

// Score façon Kahoot : répondre vite et juste rapporte plus.
// On garde au minimum la moitié des points pour une bonne réponse au buzzer.
export function scoreForAnswer({ correct, timeLeft, totalTime, basePoints }) {
  if (!correct) return 0
  const speedRatio = Math.max(0, Math.min(1, timeLeft / totalTime))
  return Math.round(basePoints * (0.5 + 0.5 * speedRatio))
}

// Simule la performance d'un ami pour l'écran de comparaison du mode Défi.
// (Sera remplacé par un vrai multijoueur plus tard.)
export function simulateFriendRun(questions, difficulty) {
  const { timePerQuestion, basePoints } = DIFFICULTIES[difficulty]
  let score = 0
  let correctCount = 0
  questions.forEach(() => {
    // L'ami a ~65% de chances de trouver la bonne réponse.
    const correct = Math.random() < 0.65
    // Temps de réponse simulé entre ~1s et la fin du chrono.
    const used = 1 + Math.random() * (timePerQuestion - 1)
    const timeLeft = timePerQuestion - used
    if (correct) correctCount += 1
    score += scoreForAnswer({ correct, timeLeft, totalTime: timePerQuestion, basePoints })
  })
  return { score, correctCount, total: questions.length }
}
