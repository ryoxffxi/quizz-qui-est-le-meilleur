// Outils de préparation des questions à l'affichage.

// Mélange l'ordre des options d'une question (Fisher-Yates) tout en gardant
// le suivi de la bonne réponse : renvoie une copie avec `options` réordonnées
// et `correct` mis à jour vers la nouvelle position de la bonne réponse.
export function shuffleOptions(question) {
  const order = question.options.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return {
    ...question,
    options: order.map((i) => question.options[i]),
    correct: order.indexOf(question.correct),
  }
}

// Mélange un tableau (copie) — Fisher-Yates.
export function shuffle(items) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ===== Tirage DÉTERMINISTE (pour le défi à deux par lien) =====
// À partir d'une même graine, les deux joueurs obtiennent exactement la même
// sélection, le même ordre des questions ET le même ordre des options.

// Générateur pseudo-aléatoire déterministe (mulberry32).
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Une graine aléatoire (32 bits).
export function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff)
}

// Fisher-Yates piloté par un générateur fourni (déterministe).
function shuffleWith(items, rng) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Mélange les options d'une question avec un générateur fourni (déterministe).
function shuffleOptionsWith(question, rng) {
  const order = question.options.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return {
    ...question,
    options: order.map((i) => question.options[i]),
    correct: order.indexOf(question.correct),
  }
}

// Construit le « paquet » de questions du défi de façon reproductible :
// même graine → même sélection, même ordre, mêmes options des deux côtés.
export function buildChallengeDeck(pool, seed, total) {
  const rng = mulberry32(seed)
  const ordered = shuffleWith(pool, rng).slice(0, total)
  return ordered.map((q) => shuffleOptionsWith(q, rng))
}
