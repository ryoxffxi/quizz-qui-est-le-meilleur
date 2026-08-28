// Génère src/content/counts.json : le nombre de questions par catégorie et par
// difficulté, SANS charger les banques dans le bundle.
//
// Pourquoi : depuis le passage en chargement paresseux, l'accueil ne peut plus
// compter les questions en important les banques (ce serait annuler le gain).
// Ce manifeste minuscule (~200 octets) lui donne les compteurs tout de suite.
//
// À relancer après CHAQUE ajout de questions : `npm run counts`
// (`npm run build` le fait déjà automatiquement).

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CONTENT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content')

// id de catégorie = nom du fichier JSON (convention du dépôt, voir content/index.js)
const banks = readdirSync(CONTENT).filter((f) => f.endsWith('.json') && f !== 'counts.json')

const counts = {}
for (const file of banks.sort()) {
  const id = file.replace(/\.json$/, '')
  const questions = JSON.parse(readFileSync(join(CONTENT, file), 'utf8'))
  const perDifficulty = {}
  for (const q of questions) {
    perDifficulty[q.difficulty] = (perDifficulty[q.difficulty] || 0) + 1
  }
  counts[id] = perDifficulty
}

writeFileSync(join(CONTENT, 'counts.json'), JSON.stringify(counts, null, 2) + '\n')

const total = Object.values(counts).reduce(
  (n, d) => n + Object.values(d).reduce((a, b) => a + b, 0),
  0,
)
console.log(`counts.json écrit — ${banks.length} banques, ${total} questions`)
for (const [id, d] of Object.entries(counts)) {
  const detail = Object.entries(d)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ')
  console.log(`  ${id.padEnd(18)} ${detail}`)
}
