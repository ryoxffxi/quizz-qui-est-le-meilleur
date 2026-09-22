// Génère src/content/panneaux-quiz.json à partir des définitions de panneaux.
//
// Trois gabarits par panneau, tous DÉTERMINISTES (graine = id du panneau) :
//   A  « Que signifie ce panneau ? »            pan_<id>_f  / pan_<id>_e
//      image du panneau, 4 noms en options
//   B  « Quel panneau signifie « {nom} » ? »    pan_<id>_fi / pan_<id>_ei
//      question inversée : 4 images en options (`optionImages`), les
//      options restent les 4 noms (lecteurs d'écran, récap d'erreurs)
//   C  « À quelle famille appartient ce panneau ? »   pan_<id>_ff (facile)
//      image du panneau, 4 libellés de familles
//
// Intrus :
//   facile : panneaux d'AUTRES familles (réponses bien distinctes), complété
//            par la même famille si besoin ;
//   expert : d'abord les JUMEAUX documentés dans confusions.js (les vrais
//            pièges), puis la même famille, puis les autres.
// Les ids ne changent jamais : les statistiques, la banque d'erreurs et les
// graines de défi s'y accrochent.
//
// Usage : node scripts/build-panneaux-quiz.mjs   (puis build-counts.mjs)
// Le module exporte aussi buildPanneauxQuiz() pour les tests.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { FAMILIES, SIGNS, getSign } from '../src/content/panneaux/signs.js'
import { confusionsBySign } from '../src/content/panneaux/confusions.js'

export const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '../src/content/panneaux-quiz.json',
)

// Thème commun à toutes les questions panneaux (filtres, examen blanc).
export const THEME = 'signalisation'
export const CATEGORY = 'panneaux'

export const QUESTION_MEANING = 'Que signifie ce panneau ?'
export const QUESTION_FAMILY = 'À quelle famille appartient ce panneau ?'
export const questionInverse = (name) => `Quel panneau signifie « ${name} » ?`

// FNV-1a : graine 32 bits stable par chaîne.
export function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Générateur pseudo-aléatoire déterministe (même algo que src/lib/quiz.js).
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

function shuffleWith(items, rng) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Normalisation pour éviter deux options au libellé identique.
export const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// Termine une phrase par un point unique (les meanings en ont déjà un). Une
// phrase close par une ellipse, « ! » ou « ? » reste telle quelle.
export const sentence = (s) => {
  const t = s.trim().replace(/[.\s]+$/, '')
  return /[…!?]$/.test(t) ? t : t + '.'
}

// Explication : « CODE : signification. » puis, en expert, le piège documenté.
function explain(sign, twin) {
  let text = `${sign.code} : ${sentence(sign.meaning)}`
  if (twin) {
    text += ` Ne pas confondre avec ${getSign(twin.id).code} : ${sentence(twin.tip)}`
  }
  return text
}

// 3 intrus (objets panneau) : on épuise chaque vivier dans l'ordre, sans jamais
// proposer deux libellés identiques.
function pickDistractors(sign, pools, rng) {
  const out = []
  const seen = new Set([norm(sign.name)])
  for (const pool of pools) {
    for (const cand of shuffleWith(pool, rng)) {
      if (out.length === 3) return out
      const key = norm(cand.name)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(cand)
    }
  }
  return out
}

// Insère la bonne réponse à une position tirée au sort.
function placeCorrect(rng, distractors, right) {
  const correct = Math.floor(rng() * 4)
  const options = [...distractors]
  options.splice(correct, 0, right)
  return { correct, options }
}

export function buildPanneauxQuiz() {
  const table = confusionsBySign(SIGNS.map((s) => s.id))
  const questions = []

  for (const sign of SIGNS) {
    const others = SIGNS.filter((s) => s.id !== sign.id)
    const sameFam = others.filter((s) => s.family === sign.family)
    const otherFam = others.filter((s) => s.family !== sign.family)
    const twins = (table[sign.id] || []).map((c) => ({
      ...getSign(c.id),
      tip: c.tip,
    }))

    for (const [difficulty, suffix] of [
      ['facile', 'f'],
      ['expert', 'e'],
    ]) {
      const pools =
        difficulty === 'facile' ? [otherFam, sameFam] : [twins, sameFam, otherFam]

      // ----- Gabarit A : image -> nom -----
      const rngA = mulberry32(hash(`${sign.id}:${difficulty}`))
      const dA = pickDistractors(sign, pools, rngA)
      if (dA.length !== 3) throw new Error(`Pas assez d'intrus pour ${sign.id} (${difficulty})`)
      const twinA = difficulty === 'expert' ? dA.find((d) => d.tip) : null
      const a = placeCorrect(rngA, dA.map((d) => d.name), sign.name)
      questions.push({
        id: `pan_${sign.id}_${suffix}`,
        category: CATEGORY,
        theme: THEME,
        difficulty,
        question: { fr: QUESTION_MEANING },
        options: { fr: a.options },
        correct: a.correct,
        explanation: { fr: explain(sign, twinA) },
        image: sign.id,
      })

      // ----- Gabarit B : nom -> image (options = noms, optionImages alignées) -----
      const rngB = mulberry32(hash(`${sign.id}:${difficulty}:inverse`))
      const dB = pickDistractors(sign, pools, rngB)
      if (dB.length !== 3) throw new Error(`Pas assez d'intrus inversés pour ${sign.id} (${difficulty})`)
      const twinB = difficulty === 'expert' ? dB.find((d) => d.tip) : null
      const b = placeCorrect(rngB, dB, sign)
      questions.push({
        id: `pan_${sign.id}_${suffix}i`,
        category: CATEGORY,
        theme: THEME,
        difficulty,
        question: { fr: questionInverse(sign.name) },
        options: { fr: b.options.map((s) => s.name) },
        optionImages: b.options.map((s) => s.id),
        correct: b.correct,
        explanation: { fr: explain(sign, twinB) },
      })
    }

    // ----- Gabarit C : image -> famille (facile seulement) -----
    const rngC = mulberry32(hash(`${sign.id}:famille`))
    const fam = FAMILIES.find((f) => f.id === sign.family)
    const otherFams = shuffleWith(
      FAMILIES.filter((f) => f.id !== sign.family),
      rngC,
    ).slice(0, 3)
    const c = placeCorrect(rngC, otherFams.map((f) => f.label), fam.label)
    questions.push({
      id: `pan_${sign.id}_ff`,
      category: CATEGORY,
      theme: THEME,
      difficulty: 'facile',
      question: { fr: QUESTION_FAMILY },
      options: { fr: c.options },
      correct: c.correct,
      explanation: {
        fr: `${sign.code} appartient à la famille « ${fam.label} ». ${sentence(fam.desc)}`,
      },
      image: sign.id,
    })
  }

  validate(questions)
  return questions
}

// ===== Validation avant écriture =====
export function validate(questions) {
  const ids = new Set()
  for (const q of questions) {
    if (ids.has(q.id)) throw new Error(`id en double : ${q.id}`)
    ids.add(q.id)
    if (q.theme !== THEME) throw new Error(`theme manquant : ${q.id}`)
    if (q.options.fr.length !== 4) throw new Error(`options != 4 : ${q.id}`)
    if (new Set(q.options.fr.map(norm)).size !== 4)
      throw new Error(`options en doublon : ${q.id}`)
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3)
      throw new Error(`correct hors borne : ${q.id}`)
    if (q.image && !getSign(q.image)) throw new Error(`image inconnue : ${q.id}`)
    if (q.optionImages) {
      if (q.optionImages.length !== 4) throw new Error(`optionImages != 4 : ${q.id}`)
      q.optionImages.forEach((id, i) => {
        const s = getSign(id)
        if (!s) throw new Error(`optionImages inconnue ${id} : ${q.id}`)
        if (s.name !== q.options.fr[i])
          throw new Error(`optionImages désalignée (${i}) : ${q.id}`)
      })
    }
    // Gabarits A et C : la bonne réponse doit correspondre à l'image.
    if (q.image && q.id.endsWith('_ff')) {
      const fam = FAMILIES.find((f) => f.id === getSign(q.image).family)
      if (q.options.fr[q.correct] !== fam.label)
        throw new Error(`famille incohérente : ${q.id}`)
    } else if (q.image && q.options.fr[q.correct] !== getSign(q.image).name) {
      throw new Error(`bonne réponse incohérente : ${q.id}`)
    }
    const texte = JSON.stringify(q)
    if (texte.includes('—')) throw new Error(`tiret long dans ${q.id}`)
  }
}

export const serialize = (questions) => JSON.stringify(questions, null, 2) + '\n'

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const questions = buildPanneauxQuiz()
  writeFileSync(OUT, serialize(questions))
  const n = (d) => questions.filter((q) => q.difficulty === d).length
  console.log(
    `${questions.length} questions (${SIGNS.length} panneaux : facile ${n('facile')}, expert ${n('expert')}) -> ${OUT}`,
  )
}
