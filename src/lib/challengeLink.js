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

export function encodeChallenge(data) {
  return base64urlEncode(JSON.stringify(data))
}

export function decodeChallenge(str) {
  try {
    const obj = JSON.parse(base64urlDecode(str))
    if (!obj || !obj.c || !obj.d || typeof obj.s !== 'number') return null
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
    if (!obj || !obj.c || !obj.d) return null
    if (obj.solo) return obj // résultat Solo : { c, d, sc, tot }
    if (!Array.isArray(obj.r1) || !Array.isArray(obj.r2)) return null
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
