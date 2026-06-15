// Réglages de jeu et calcul du score, regroupés au même endroit.

export const DIFFICULTIES = {
  facile: {
    id: 'facile',
    label: 'Facile',
    timePerQuestion: 10, // secondes par question en mode Défi
    basePoints: 1000, // points de base par bonne réponse
  },
  expert: {
    id: 'expert',
    label: 'Expert',
    timePerQuestion: 7, // chronomètre plus court
    basePoints: 1500, // mais des points plus élevés
  },
}

export const CHALLENGE_QUESTION_COUNT = 5 // questions par manche
export const CHALLENGE_MAX_ROUNDS = 8 // plafond absolu : 8 manches × 5 = 40 questions
export const CHALLENGE_ROUND_OPTIONS = [1, 3, 5, 8] // choix proposés
export const CHALLENGE_DEFAULT_ROUNDS = 3 // valeur par défaut
export const SOLO_BATCH_SIZE = 10 // questions par lot en mode Solo
export const SOLO_MAX_BATCHES = 4 // 4 lots × 10 = 40 questions

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
  return { name: 'Ton pote', score, correctCount, total: questions.length }
}
