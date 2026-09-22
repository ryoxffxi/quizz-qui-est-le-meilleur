// Outils de préparation des questions à l'affichage.

// Ordre aléatoire des index 0..n-1 (Fisher-Yates) piloté par `rng` (0 ≤ x < 1).
function randomOrder(n, rng) {
  const order = Array.from({ length: n }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

// Réordonne les options d'une question selon `order` (tableau d'index) :
// renvoie une copie avec `options` (et `optionImages` s'il existe) permutées
// et `correct` recalculé vers la nouvelle position de la bonne réponse.
function permuteOptions(question, order) {
  const out = {
    ...question,
    options: order.map((i) => question.options[i]),
    correct: order.indexOf(question.correct),
  }
  if (Array.isArray(question.optionImages)) {
    out.optionImages = order.map((i) => question.optionImages[i])
  }
  return out
}

// Mélange l'ordre des options d'une question tout en gardant le suivi de la
// bonne réponse (copie ; `optionImages` suit les options).
export function shuffleOptions(question) {
  return permuteOptions(question, randomOrder(question.options.length, Math.random))
}

// Mélange un tableau (copie) : Fisher-Yates.
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
// sélection, le même ordre des questions ET le même ordre des options, et ce
// même si la banque a changé entre-temps (le tirage dépend des ids, pas des
// positions dans le fichier).

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

// Empreinte FNV-1a 32 bits d'une chaîne (unités UTF-16), entier non signé.
export function hashString(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

// Une graine aléatoire (32 bits).
export function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff)
}

// Finaliseur 32 bits (fmix32 de MurmurHash3) : FNV-1a diffuse mal le DERNIER
// caractère, or les ids ne diffèrent souvent que par leurs derniers chiffres
// (route_0010, route_0011...). Sans ce brassage, un paquet sortirait par blocs
// d'ids consécutifs.
function mix32(h) {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

// Rang d'une question pour une graine : dépend de l'id, jamais de la position.
export function rankOf(seedKey, id) {
  return mix32(hashString(`${seedKey}:${id}`))
}

// Paquet de `count` questions COPIÉES, choisi et ordonné par la graine :
//   - sélection et ordre = classement croissant de rankOf(seedKey, id)
//     (brassage de hashString(seedKey:id)), donc ajouter ou retirer d'autres
//     questions ne bouleverse pas le paquet (au plus une question remplacée
//     par question ajoutée ou retirée) ;
//   - ordre des options = mulberry32(hashString(seedKey#id)), `correct` recalculé,
//     `optionImages` permuté avec les options.
export function seededDeck(pool, seedKey, count) {
  const key = String(seedKey)
  return pool
    .map((q) => ({ q, h: rankOf(key, q.id) }))
    .sort((a, b) => a.h - b.h || (a.q.id < b.q.id ? -1 : a.q.id > b.q.id ? 1 : 0))
    .slice(0, Math.max(0, count))
    .map(({ q }) =>
      permuteOptions(
        q,
        randomOrder(q.options.length, mulberry32(hashString(`${key}#${q.id}`))),
      ),
    )
}

// Paquet du défi : même graine (nombre) → même paquet des deux côtés.
export function buildChallengeDeck(pool, seed, total) {
  return seededDeck(pool, String(seed), total)
}
