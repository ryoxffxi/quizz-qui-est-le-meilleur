// Fusionne une vague de nouvelles questions dans une banque existante.
//
//   node scripts/merge-questions.mjs <categorie> <fichier-vague.json> [--dry]
//   node scripts/merge-questions.mjs culture-generale /tmp/vague-1.json
//
// Le fichier de vague est un tableau d'objets SANS `id` ni `category` (ils sont
// attribués ici) : { difficulty, question:{fr,en,es,pt}, options:{...},
// correct, explanation:{...}, image?, optionImages?, theme? }.
//
// Le script REFUSE la fusion entière si une question est invalide : mieux vaut
// corriger la vague que polluer la banque. Sont bloquants, en plus de la forme
// (4 options, langues, correct) : un champ inconnu, un tiret long, une réponse
// contenue dans l'énoncé, et un DOUBLON SÉMANTIQUE (même bonne réponse et
// énoncé qui recoupe une question déjà en banque, ou une autre de la vague).
// Les doublons EXACTS d'énoncé, eux, sont simplement écartés avec un rapport :
// une vague peut légitimement en contenir. Les contrôles sont ceux de
// scripts/lib/qa.mjs, partagés avec audit-questions.mjs.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  LANGS,
  DIFFICULTES,
  CLES_CONNUES,
  normalise,
  clesInconnues,
  tiretLong,
  reponseDansEnonce,
  doublonsSemantiques,
} from './lib/qa.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// Préfixe d'id par catégorie. Les ids sont publics (pages statiques, stats et
// banque d'erreurs en localStorage, tirage des Défis par hash(graine + id)) :
// on ne les renomme jamais, on ne les réemploie jamais.
const ID_PREFIX = {
  'culture-generale': 'culture',
  'manga-anime': 'manga',
  'cinema-series': 'cinema',
  'code-route': 'route',
  'panneaux-quiz': 'panneaux',
}

// Banques volontairement monolingues (`frOnly` dans content/index.js) : le code
// de la route et les panneaux sont propres à la France.
const BANQUES_FR_SEUL = new Set(['code-route', 'panneaux-quiz'])

// Champs qu'une entrée de vague peut porter : tout ce qu'une question connaît,
// sauf l'id et la catégorie, attribués ici.
const CLES_VAGUE = CLES_CONNUES.filter((k) => k !== 'id' && k !== 'category')

// Champs facultatifs recopiés tels quels quand ils sont présents.
const CLES_FACULTATIVES = ['image', 'optionImages', 'theme']

const [, , categorie, fichier, ...flags] = process.argv
const dryRun = flags.includes('--dry')

if (!categorie || !fichier) {
  console.error('usage: node scripts/merge-questions.mjs <categorie> <vague.json> [--dry]')
  process.exit(1)
}
if (!ID_PREFIX[categorie]) {
  console.error(`catégorie inconnue : ${categorie}`)
  console.error(`connues : ${Object.keys(ID_PREFIX).join(', ')}`)
  process.exit(1)
}

const banquePath = join(ROOT, 'src', 'content', `${categorie}.json`)
const banque = JSON.parse(readFileSync(banquePath, 'utf8'))
const vague = JSON.parse(readFileSync(fichier, 'utf8'))

const langues = BANQUES_FR_SEUL.has(categorie) ? ['fr'] : LANGS

// ---------------------------------------------------------------------------
// 1. Forme et contenu de chaque entrée
// ---------------------------------------------------------------------------
const erreurs = []
function verifie(q, i) {
  const ou = `vague[${i}]`
  if (!DIFFICULTES.includes(q.difficulty))
    erreurs.push(`${ou} : difficulty « ${q.difficulty} » (attendu facile|expert)`)
  if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3)
    erreurs.push(`${ou} : correct = ${q.correct} (attendu un entier 0-3)`)

  const inconnues = clesInconnues(q, CLES_VAGUE)
  if (inconnues.length)
    erreurs.push(`${ou} : champ(s) non attendu(s) ${inconnues.join(', ')} (id et category sont attribués ici)`)

  for (const lang of langues) {
    if (!q.question?.[lang]?.trim()) erreurs.push(`${ou} : question.${lang} manquante`)
    if (!q.explanation?.[lang]?.trim()) erreurs.push(`${ou} : explanation.${lang} manquante`)

    const options = q.options?.[lang]
    if (!Array.isArray(options) || options.length !== 4) {
      erreurs.push(`${ou} : options.${lang} doit contenir exactement 4 entrées`)
      continue
    }
    if (options.some((o) => !String(o).trim()))
      erreurs.push(`${ou} : options.${lang} contient une entrée vide`)
    // Deux options identiques rendent la question injouable (deux bonnes
    // réponses possibles, ou un choix qui ne veut rien dire).
    const uniques = new Set(options.map((o) => normalise(String(o))))
    if (uniques.size !== 4)
      erreurs.push(`${ou} : options.${lang} contient des doublons`)
  }

  const tirets = tiretLong(q)
  if (tirets.length)
    erreurs.push(`${ou} : tiret long (U+2014) dans ${tirets.join(', ')} (deux-points, virgule ou point)`)

  if (q.question?.fr && Array.isArray(q.options?.fr) && reponseDansEnonce(q))
    erreurs.push(`${ou} : la réponse « ${q.options.fr[q.correct]} » est déjà dans l'énoncé`)
}

vague.forEach(verifie)

if (erreurs.length) {
  console.error(`❌ ${erreurs.length} problème(s), rien n'a été fusionné :\n`)
  erreurs.forEach((e) => console.error('  ' + e))
  process.exit(1)
}

// ---------------------------------------------------------------------------
// 2. Doublons exacts : contre la banque ET à l'intérieur de la vague
// ---------------------------------------------------------------------------
const vus = new Set(banque.map((q) => normalise(q.question.fr)))
const retenues = []
const doublons = []
for (const q of vague) {
  const cle = normalise(q.question.fr)
  if (vus.has(cle)) {
    doublons.push(q.question.fr)
    continue
  }
  vus.add(cle)
  retenues.push(q)
}

// ---------------------------------------------------------------------------
// 3. Doublons sémantiques : bloquants. On donne aux retenues un id provisoire
//    pour les distinguer dans les paires renvoyées par qa.mjs.
// ---------------------------------------------------------------------------
const provisoires = retenues.map((q, i) => ({ ...q, id: `vague[${vague.indexOf(q)}]#${i}` }))
const semantiques = doublonsSemantiques([...banque, ...provisoires]).filter(
  (p) => p.a.startsWith('vague[') || p.b.startsWith('vague['),
)
if (semantiques.length) {
  const texteDe = (id) =>
    (banque.find((q) => q.id === id) || provisoires.find((q) => q.id === id))?.question.fr
  console.error(`❌ ${semantiques.length} doublon(s) sémantique(s), rien n'a été fusionné :\n`)
  for (const p of semantiques) {
    const a = p.a.replace(/#\d+$/, '')
    const b = p.b.replace(/#\d+$/, '')
    console.error(`  ${a} ≈ ${b} (${p.raison}, recoupement ${Math.round(p.score * 100)} %)`)
    console.error(`    · ${texteDe(p.a)}`)
    console.error(`    · ${texteDe(p.b)}`)
  }
  console.error('\n  Reformule ou retire ces questions de la vague, puis relance.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// 4. Ids séquentiels à la suite du plus grand existant (jamais de réemploi)
// ---------------------------------------------------------------------------
const prefixe = ID_PREFIX[categorie]
const maxId = banque.reduce((max, q) => {
  const n = Number.parseInt(String(q.id).replace(`${prefixe}_`, ''), 10)
  return Number.isFinite(n) && n > max ? n : max
}, 0)

const ajoutees = retenues.map((q, i) => {
  const question = {
    id: `${prefixe}_${String(maxId + 1 + i).padStart(4, '0')}`,
    category: categorie,
    difficulty: q.difficulty,
    question: q.question,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
  }
  for (const cle of CLES_FACULTATIVES) if (q[cle] !== undefined) question[cle] = q[cle]
  return question
})

const compte = (liste, d) => liste.filter((q) => q.difficulty === d).length

console.log(`Banque « ${categorie} » : ${banque.length} questions`)
console.log(`Vague    : ${vague.length} proposées`)
if (doublons.length) {
  console.log(`Doublons exacts : ${doublons.length} écartée(s)`)
  doublons.forEach((d) => console.log(`  · ${d}`))
}
console.log(`Retenues : ${ajoutees.length} (facile ${compte(ajoutees, 'facile')}, expert ${compte(ajoutees, 'expert')})`)

if (dryRun) {
  console.log('\n--dry : rien écrit.')
  process.exit(0)
}

const fusionnee = [...banque, ...ajoutees]
writeFileSync(banquePath, JSON.stringify(fusionnee, null, 2) + '\n')

console.log(
  `\n✅ ${banquePath.replace(ROOT + '/', '')} : ${fusionnee.length} questions ` +
    `(facile ${compte(fusionnee, 'facile')}, expert ${compte(fusionnee, 'expert')})`,
)
if (ajoutees.length) {
  console.log(`   ids ${ajoutees[0].id} → ${ajoutees[ajoutees.length - 1].id}`)
}
console.log('   pense à `npm run counts` (ou `npm run build`) pour l\'accueil.')
