// Mémoire CROSS-SESSION des questions déjà vues en solo, par catégorie+difficulté.
// But : réviser sans retomber tout de suite sur les mêmes questions au retour sur
// le site. On parcourt toute la banque (ordre aléatoire) avant de relancer un cycle.
const KEY = (cat, diff) => `quizz_seen_${cat}_${diff}`

// `pool` (facultatif) : questions ({ id }) ou ids de la banque courante. Les
// ids mémorisés qui n'y figurent plus (questions retirées ou passées à l'autre
// niveau par une vague de contenu) sont élagués et le stockage remis à jour,
// sinon le compteur « n vues / total » de l'accueil dépasserait le total.
export function loadSeen(cat, diff, pool) {
  let set = new Set()
  try {
    const raw = localStorage.getItem(KEY(cat, diff))
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) set = new Set(parsed)
    }
  } catch {
    /* localStorage indisponible ou contenu illisible */
  }
  if (pool != null) {
    const valid = new Set(Array.from(pool, (q) => (typeof q === 'string' ? q : q?.id)))
    const pruned = new Set([...set].filter((id) => valid.has(id)))
    if (pruned.size !== set.size) {
      saveSeen(cat, diff, pruned)
      set = pruned
    }
  }
  return set
}

export function saveSeen(cat, diff, set) {
  try {
    localStorage.setItem(KEY(cat, diff), JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
}

// Marque UNE question comme vue (à appeler à la validation de la réponse, pas
// à l'affichage : une question quittée sans répondre reviendra).
export function markSeen(cat, diff, id) {
  const set = loadSeen(cat, diff)
  if (set.has(id)) return
  set.add(id)
  saveSeen(cat, diff, set)
}

// Mélange (copie) : Fisher-Yates. Local pour rester indépendant de quiz.js.
function shuffled(items) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Tire un lot de `n` questions, PUR (aucune écriture, aucun argument modifié) :
//   1. d'abord les questions jamais vues (ni cette session, ni les précédentes) ;
//   2. s'il en manque, on complète avec des questions déjà vues mais pas encore
//      jouées cette session, sans doublon ;
//   3. cycleReset=true dès qu'on a dû compléter : toute la banque a été parcourue,
//      l'appelant doit vider le store (nouveau cycle de révision).
// Le lot peut être plus court que `n` quand la session a presque épuisé la banque,
// et vide quand tout a été joué cette session.
export function pickSoloBatch(pool, seenStore, sessionSeen, n) {
  const store = seenStore || new Set()
  const session = sessionSeen || new Set()
  const playable = pool.filter((q) => !session.has(q.id))
  const unseen = playable.filter((q) => !store.has(q.id))
  const questions = shuffled(unseen).slice(0, n)
  let cycleReset = false
  if (questions.length < n && playable.length > questions.length) {
    const taken = new Set(questions.map((q) => q.id))
    const rest = shuffled(playable.filter((q) => !taken.has(q.id)))
    questions.push(...rest.slice(0, n - questions.length))
    cycleReset = true
  }
  return { questions, cycleReset }
}
