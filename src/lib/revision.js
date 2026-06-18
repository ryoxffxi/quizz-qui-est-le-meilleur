// Mémoire CROSS-SESSION des questions déjà vues en solo, par catégorie+difficulté.
// But : réviser sans retomber tout de suite sur les mêmes questions au retour sur
// le site. On parcourt toute la banque (ordre aléatoire) avant de relancer un cycle.
const KEY = (cat, diff) => `quizz_seen_${cat}_${diff}`

export function loadSeen(cat, diff) {
  try {
    const raw = localStorage.getItem(KEY(cat, diff))
    if (raw) return new Set(JSON.parse(raw))
  } catch {
    /* localStorage indisponible */
  }
  return new Set()
}

export function saveSeen(cat, diff, set) {
  try {
    localStorage.setItem(KEY(cat, diff), JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
}
