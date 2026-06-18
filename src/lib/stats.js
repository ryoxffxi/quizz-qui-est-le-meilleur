// Statistiques cumulées du joueur (toutes sessions confondues), en localStorage.
// Sert à afficher, en fin de manche, le total de questions jouées et de bonnes
// réponses. Aucune donnée personnelle, pas de compte.
const KEY = 'quizz_stats'

export function getStats() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      return { answered: s.answered || 0, correct: s.correct || 0 }
    }
  } catch {
    /* localStorage indisponible */
  }
  return { answered: 0, correct: 0 }
}

// Ajoute le bilan d'une manche au total cumulé. Renvoie le nouveau total.
export function recordRound(answered, correct) {
  const cur = getStats()
  const next = {
    answered: cur.answered + (answered || 0),
    correct: cur.correct + (correct || 0),
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}
