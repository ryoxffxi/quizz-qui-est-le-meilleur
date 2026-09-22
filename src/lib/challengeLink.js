// Encodage/décodage du défi dans l'URL (tout côté client, sans serveur).
// On encode un petit objet : pseudo, catégorie, difficulté, graine, scores par
// manche. La sélection des questions est régénérée via la graine (voir
// buildChallengeDeck), donc l'URL reste courte.
//
// Les données vivent dans le hash de la racine (`/#defi=…`, `/#resultat=…`),
// compatible SPA et pages statiques.
import { CHALLENGE_MAX_ROUNDS, DIFFICULTIES } from './game'

// Payload défi : { p: pseudo, c: categoryId, d: difficulty, s: seed,
//                  n: nbManches, r: [scores par manche], l: langue }

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

// ===== Validateurs =====
// Les payloads voyagent dans une URL FALSIFIABLE : on ne fait jamais confiance
// aux types. On REJETTE tout lien dont un champ rendu ou calculé n'est pas du
// bon type ou hors bornes (les liens légitimes passent inchangés), et on ne
// renvoie que les champs connus.
const LANGS = ['fr', 'en', 'es', 'pt']
const MODES = ['solo', 'examen', 'quotidien', 'erreurs', 'defi']
export const MAX_ROUND_SCORE = 60000 // borne large : 5 questions × 1500 pts max
const MAX_SOLO_SCORE = 1000000

const isStr = (v, max = 64) => typeof v === 'string' && v.length <= max
// Pseudo affiché : pas de caractère de contrôle (retour à la ligne, etc.).
// eslint-disable-next-line no-control-regex
const isName = (v) => isStr(v, 24) && !/[\u0000-\u001f\u007f]/.test(v)
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max
const isCat = (v) => typeof v === 'string' && /^[a-z0-9-]{1,32}$/.test(v)
const isDiff = (v) => typeof v === 'string' && Object.hasOwn(DIFFICULTIES, v)
const isSeed = (v) => isInt(v, 0, 0xffffffff)
const isRounds = (v) => isInt(v, 1, CHALLENGE_MAX_ROUNDS)
const isLang = (v) => LANGS.includes(v)
const isMode = (v) => MODES.includes(v)
const isScoreArray = (v) =>
  Array.isArray(v) &&
  v.length <= CHALLENGE_MAX_ROUNDS &&
  v.every((x) => isInt(x, 0, MAX_ROUND_SCORE))
// Grille emoji : 40 questions max, une ligne de 10 par ligne.
const isGrid = (v) => typeof v === 'string' && v.length <= 120 && /^[🟩🟥\n]*$/u.test(v)

function parse(str) {
  const obj = JSON.parse(base64urlDecode(str))
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null
  return obj
}

// Racine de l'app (les hashs de partage vivent sur `/`).
function appRoot() {
  return `${window.location.origin}/`
}

// ===== Lien de DÉFI (#defi=) =====

export function encodeChallenge(data) {
  return base64urlEncode(JSON.stringify(data))
}

export function decodeChallenge(str) {
  try {
    const obj = parse(str)
    if (!obj || !isCat(obj.c) || !isDiff(obj.d) || !isSeed(obj.s)) return null
    if (obj.p != null && !isName(obj.p)) return null
    if (obj.n != null && !isRounds(obj.n)) return null
    if (obj.r != null && !isScoreArray(obj.r)) return null
    if (obj.l != null && !isLang(obj.l)) return null
    const out = { c: obj.c, d: obj.d, s: obj.s }
    if (obj.p != null) out.p = obj.p
    if (obj.n != null) out.n = obj.n
    if (obj.r != null) out.r = obj.r
    if (obj.l != null) out.l = obj.l
    return out
  } catch {
    return null
  }
}

// Lien complet partageable (la donnée vit dans le hash → compatible SPA / Pages).
export function buildChallengeUrl(data) {
  return `${appRoot()}#defi=${encodeChallenge(data)}`
}

// Lit un défi présent dans l'URL au chargement, le cas échéant.
export function readChallengeFromUrl() {
  if (typeof window === 'undefined') return null
  const m = window.location.hash.match(/[#&]defi=([^&]+)/)
  return m ? decodeChallenge(m[1]) : null
}

// ===== Lien de RÉSULTAT (#resultat=, lecture seule) =====
// Solo (et modes assimilés) : { solo: 1, c, d, l, sc, tot, mode?, grid? }
//   mode ∈ solo | examen | quotidien | erreurs | defi (libellé de la carte) ;
//   pour 'defi', sc = points et tot = maximum possible.
// Duel : { c, d, l, n, p1, r1, p2, r2, s?, n? }
//   s et n (graine, manches) permettent de rejouer les mêmes questions depuis
//   la page de résultat ; facultatifs pour les anciens liens.

export function encodeResult(data) {
  return base64urlEncode(JSON.stringify(data))
}

export function decodeResult(str) {
  try {
    const obj = parse(str)
    if (!obj || !isCat(obj.c) || !isDiff(obj.d)) return null
    if (obj.l != null && !isLang(obj.l)) return null
    if (obj.solo) {
      if (!isInt(obj.sc, 0, MAX_SOLO_SCORE) || !isInt(obj.tot, 0, MAX_SOLO_SCORE)) return null
      if (obj.mode != null && !isMode(obj.mode)) return null
      if (obj.grid != null && !isGrid(obj.grid)) return null
      const out = { solo: 1, c: obj.c, d: obj.d, sc: obj.sc, tot: obj.tot }
      if (obj.l != null) out.l = obj.l
      if (obj.mode != null) out.mode = obj.mode
      if (obj.grid != null) out.grid = obj.grid
      return out
    }
    if (!isScoreArray(obj.r1) || !isScoreArray(obj.r2)) return null
    if (obj.p1 != null && !isName(obj.p1)) return null
    if (obj.p2 != null && !isName(obj.p2)) return null
    if (obj.s != null && !isSeed(obj.s)) return null
    if (obj.n != null && !isRounds(obj.n)) return null
    const out = { c: obj.c, d: obj.d, r1: obj.r1, r2: obj.r2 }
    if (obj.l != null) out.l = obj.l
    if (obj.p1 != null) out.p1 = obj.p1
    if (obj.p2 != null) out.p2 = obj.p2
    if (obj.s != null) out.s = obj.s
    if (obj.n != null) out.n = obj.n
    return out
  } catch {
    return null
  }
}

export function buildResultUrl(data) {
  return `${appRoot()}#resultat=${encodeResult(data)}`
}

export function readResultFromUrl() {
  if (typeof window === 'undefined') return null
  const m = window.location.hash.match(/[#&]resultat=([^&]+)/)
  return m ? decodeResult(m[1]) : null
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
