// Encodage/décodage du défi dans l'URL (tout côté client, sans serveur).
// On encode un petit objet : pseudo, catégorie, difficulté, graine, scores par
// manche. La sélection des questions est régénérée via la graine (voir
// buildChallengeDeck), donc l'URL reste courte.

// Payload : { p: pseudo, c: categoryId, d: difficulty, s: seed,
//             n: nbManches, r: [scores par manche] }

function base64urlEncode(str) {
  const utf8 = new TextEncoder().encode(str)
  let bin = ''
  utf8.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(padded)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// Validateurs : les payloads voyagent dans une URL FALSIFIABLE -> on ne fait
// jamais confiance aux types. On REJETTE tout lien dont un champ rendu/calculé
// n'est pas du bon type (les liens légitimes passent inchangés).
const isStr = (v, max = 64) => typeof v === 'string' && v.length <= max
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const isNumArray = (v, maxLen = 8) =>
  Array.isArray(v) && v.length <= maxLen && v.every(isNum)

export function encodeChallenge(data) {
  return base64urlEncode(JSON.stringify(data))
}

export function decodeChallenge(str) {
  try {
    const obj = JSON.parse(base64urlDecode(str))
    if (!obj || !isStr(obj.c) || !isStr(obj.d) || !isNum(obj.s)) return null
    if (obj.p != null && !isStr(obj.p, 24)) return null
    if (obj.n != null && !isNum(obj.n)) return null
    return obj
  } catch {
    return null
  }
}

// Lien complet partageable (la donnée vit dans le hash → compatible SPA / Pages).
export function buildChallengeUrl(data) {
  const base = window.location.origin + window.location.pathname
  return `${base}#defi=${encodeChallenge(data)}`
}

// Lit un défi présent dans l'URL au chargement, le cas échéant.
export function readChallengeFromUrl() {
  if (typeof window === 'undefined') return null
  const m = window.location.hash.match(/[#&]defi=([^&]+)/)
  return m ? decodeChallenge(m[1]) : null
}

// ===== Lien de RÉSULTAT (lecture seule) =====
// Payload : { c, d, n, p1, r1: [scores], p2, r2: [scores] }

export function encodeResult(data) {
  return base64urlEncode(JSON.stringify(data))
}

export function decodeResult(str) {
  try {
    const obj = JSON.parse(base64urlDecode(str))
    if (!obj || !isStr(obj.c) || !isStr(obj.d)) return null
    if (obj.solo) {
      // Résultat Solo : { c, d, sc, tot } — champs rendus, doivent être finis.
      if (!isNum(obj.sc) || !isNum(obj.tot)) return null
      return obj
    }
    // Résultat Duel : { c, d, n, p1, r1, p2, r2 } — r1/r2 sommés + utilisés en style.
    if (!isNumArray(obj.r1) || !isNumArray(obj.r2)) return null
    if (obj.p1 != null && !isStr(obj.p1, 24)) return null
    if (obj.p2 != null && !isStr(obj.p2, 24)) return null
    return obj
  } catch {
    return null
  }
}

export function buildResultUrl(data) {
  const base = window.location.origin + window.location.pathname
  return `${base}#resultat=${encodeResult(data)}`
}

export function readResultFromUrl() {
  if (typeof window === 'undefined') return null
  const m = window.location.hash.match(/[#&]resultat=([^&]+)/)
  return m ? decodeResult(m[1]) : null
}

// ===== Lien « Inviter à jouer » (boucle virale, sans scores) =====
// Payload : { c, d, l }  → ouvre l'app sur la config de défi de cette catégorie.

export function encodePlay(data) {
  return base64urlEncode(JSON.stringify(data))
}

export function decodePlay(str) {
  try {
    const obj = JSON.parse(base64urlDecode(str))
    if (!obj || !obj.c || !obj.d) return null
    return obj
  } catch {
    return null
  }
}

export function buildPlayUrl(data) {
  const base = window.location.origin + window.location.pathname
  return `${base}#jouer=${encodePlay(data)}`
}

export function readPlayFromUrl() {
  if (typeof window === 'undefined') return null
  const m = window.location.hash.match(/[#&]jouer=([^&]+)/)
  return m ? decodePlay(m[1]) : null
}

// URL « propre » du jeu (pour l'affichage sur la carte image).
export function gameHost() {
  if (typeof window === 'undefined') return 'Quizz'
  return window.location.host || 'Quizz'
}

// Nettoie le hash (quand on revient à l'accueil).
export function clearChallengeUrl() {
  if (typeof window === 'undefined') return
  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  )
}
