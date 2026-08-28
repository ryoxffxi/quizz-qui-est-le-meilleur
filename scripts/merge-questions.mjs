// Fusionne une vague de nouvelles questions dans une banque existante.
//
//   node scripts/merge-questions.mjs <categorie> <fichier-vague.json> [--dry]
//   node scripts/merge-questions.mjs culture-generale /tmp/vague-1.json
//
// Le fichier de vague est un tableau d'objets SANS `id` ni `category` (ils sont
// attribués ici) : { difficulty, question:{fr,en,es,pt}, options:{...},
// correct, explanation:{...} }.
//
// Le script REFUSE la fusion entière si une question est invalide : mieux vaut
// corriger la vague que polluer la banque. Les doublons, eux, sont simplement
// écartés avec un rapport (une vague peut légitimement en contenir).

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LANGS = ['fr', 'en', 'es', 'pt']
const DIFFICULTIES = ['facile', 'expert']

// Préfixe d'id par catégorie (les ids sont publics : ils voyagent dans les
// liens de Défi via la graine, on ne les renomme jamais).
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

// Normalisation pour la détection de doublons : minuscules, sans accents, sans
// ponctuation ni espaces multiples. « Quelle est la capitale ? » == « quelle
// est la capitale »
function normalise(texte) {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents décomposés par NFD
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const langues = BANQUES_FR_SEUL.has(categorie) ? ['fr'] : LANGS

const erreurs = []
function verifie(q, i) {
  const ou = `vague[${i}]`
  if (!DIFFICULTIES.includes(q.difficulty))
    erreurs.push(`${ou} : difficulty « ${q.difficulty} » (attendu facile|expert)`)
  if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3)
    erreurs.push(`${ou} : correct = ${q.correct} (attendu un entier 0-3)`)

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
}

vague.forEach(verifie)

if (erreurs.length) {
  console.error(`❌ ${erreurs.length} problème(s) — rien n'a été fusionné :\n`)
  erreurs.forEach((e) => console.error('  ' + e))
  process.exit(1)
}

// Doublons : contre la banque ET à l'intérieur de la vague elle-même.
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

// Ids séquentiels à la suite du plus grand existant (jamais de réemploi).
const prefixe = ID_PREFIX[categorie]
const maxId = banque.reduce((max, q) => {
  const n = Number.parseInt(String(q.id).replace(`${prefixe}_`, ''), 10)
  return Number.isFinite(n) && n > max ? n : max
}, 0)

const ajoutees = retenues.map((q, i) => ({
  id: `${prefixe}_${String(maxId + 1 + i).padStart(4, '0')}`,
  category: categorie,
  difficulty: q.difficulty,
  question: q.question,
  options: q.options,
  correct: q.correct,
  explanation: q.explanation,
}))

const compte = (liste, d) => liste.filter((q) => q.difficulty === d).length

console.log(`Banque « ${categorie} » : ${banque.length} questions`)
console.log(`Vague    : ${vague.length} proposées`)
if (doublons.length) {
  console.log(`Doublons : ${doublons.length} écartée(s)`)
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
