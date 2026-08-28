// Retire des questions d'une banque, par id.
//
//   node scripts/remove-questions.mjs <categorie> <id> [<id>...] [--dry]
//
// Les ids NE SONT PAS réattribués : ils voyagent dans les liens de Défi (la
// graine rejoue la même sélection) et renuméroter casserait les liens partagés.
// Une banque peut donc avoir des trous dans sa numérotation, c'est normal.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const [, , categorie, ...reste] = process.argv
const dryRun = reste.includes('--dry')
const ids = reste.filter((a) => a !== '--dry')

if (!categorie || !ids.length) {
  console.error('usage: node scripts/remove-questions.mjs <categorie> <id> [<id>...] [--dry]')
  process.exit(1)
}

const chemin = join(ROOT, 'src', 'content', `${categorie}.json`)
const banque = JSON.parse(readFileSync(chemin, 'utf8'))

const aRetirer = new Set(ids)
const introuvables = ids.filter((id) => !banque.some((q) => q.id === id))
if (introuvables.length) {
  console.error(`❌ ids introuvables dans « ${categorie} » : ${introuvables.join(', ')}`)
  process.exit(1)
}

const gardees = []
for (const q of banque) {
  if (aRetirer.has(q.id)) {
    console.log(`  − ${q.id} [${q.difficulty}] ${q.question.fr}`)
  } else {
    gardees.push(q)
  }
}

const compte = (liste, d) => liste.filter((q) => q.difficulty === d).length
console.log(
  `\n« ${categorie} » : ${banque.length} → ${gardees.length} questions ` +
    `(facile ${compte(gardees, 'facile')}, expert ${compte(gardees, 'expert')})`,
)

if (dryRun) {
  console.log('--dry : rien écrit.')
  process.exit(0)
}

writeFileSync(chemin, JSON.stringify(gardees, null, 2) + '\n')
console.log(`✅ écrit. Pense à \`npm run counts\`.`)
