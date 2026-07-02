// Génère src/content/panneaux-quiz.json à partir des définitions de panneaux :
// 1 question « facile » + 1 « expert » par panneau, avec l'image du panneau.
// - facile : intrus pris dans les AUTRES familles (réponses bien distinctes)
// - expert : intrus pris dans la MÊME famille (les confusions classiques)
// Tirages DÉTERMINISTES (graine = id du panneau) : le fichier ne bouge pas
// d'une génération à l'autre tant que la banque de panneaux ne change pas
// (indispensable au mode Défi, qui rejoue le même paquet via une graine).
//
// Usage : node scripts/build-panneaux-quiz.mjs
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SIGNS } from '../src/content/panneaux/signs.js'

const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/content/panneaux-quiz.json',
)

// FNV-1a : graine 32 bits stable par chaîne.
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Générateur pseudo-aléatoire déterministe (même algo que src/lib/quiz.js).
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleWith(items, rng) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Normalisation pour éviter deux options au libellé identique.
const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// 3 intrus : d'abord dans `primary`, complété par `secondary` si besoin.
function pickDistractors(sign, primary, secondary, rng) {
  const out = []
  const seen = new Set([norm(sign.name)])
  for (const pool of [primary, secondary]) {
    for (const cand of shuffleWith(pool, rng)) {
      if (out.length === 3) return out
      const key = norm(cand.name)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(cand.name)
    }
  }
  return out
}

const questions = []
for (const sign of SIGNS) {
  const others = SIGNS.filter((s) => s.id !== sign.id)
  const sameFam = others.filter((s) => s.family === sign.family)
  const otherFam = others.filter((s) => s.family !== sign.family)

  for (const [difficulty, suffix, primary, secondary] of [
    ['facile', 'f', otherFam, sameFam],
    ['expert', 'e', sameFam, otherFam],
  ]) {
    const rng = mulberry32(hash(`${sign.id}:${difficulty}`))
    const distractors = pickDistractors(sign, primary, secondary, rng)
    if (distractors.length !== 3) {
      throw new Error(`Pas assez d'intrus pour ${sign.id} (${difficulty})`)
    }
    const correct = Math.floor(rng() * 4)
    const options = [...distractors]
    options.splice(correct, 0, sign.name)
    questions.push({
      id: `pan_${sign.id}_${suffix}`,
      category: 'panneaux',
      difficulty,
      question: { fr: 'Que signifie ce panneau ?' },
      options: { fr: options },
      correct,
      explanation: { fr: `${sign.code} — ${sign.meaning}` },
      image: sign.id,
    })
  }
}

// ===== Validation avant écriture =====
const ids = new Set()
for (const q of questions) {
  if (ids.has(q.id)) throw new Error(`id en double : ${q.id}`)
  ids.add(q.id)
  if (q.options.fr.length !== 4) throw new Error(`options != 4 : ${q.id}`)
  if (new Set(q.options.fr.map(norm)).size !== 4)
    throw new Error(`options en doublon : ${q.id}`)
  if (q.correct < 0 || q.correct > 3) throw new Error(`correct hors borne : ${q.id}`)
  if (q.options.fr[q.correct] !== SIGNS.find((s) => s.id === q.image).name)
    throw new Error(`bonne réponse incohérente : ${q.id}`)
}

writeFileSync(OUT, JSON.stringify(questions, null, 2) + '\n')
console.log(
  `${questions.length} questions (${SIGNS.length} panneaux × 2 difficultés) -> ${OUT}`,
)
