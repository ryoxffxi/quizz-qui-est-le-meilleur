// Repère (et retire) les clés de traduction que plus aucun code n'utilise.
//
//   node scripts/i18n-orphans.mjs         → rapport seul
//   node scripts/i18n-orphans.mjs --fix   → retire les clés des 4 langues
//
// Le français fait référence : une clé absente de fr.js n'est pas gérée ici.
// ⚠️ Les clés construites à la volée (`diff_${difficulty}`, la valeur renvoyée
// par personalityKey…) ne peuvent PAS être détectées par simple recherche de
// texte. Elles sont listées ci-dessous et toujours considérées comme utilisées.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const LANGS = ['fr', 'en', 'es', 'pt']

// Préfixes de clés assemblées dynamiquement dans le code : à ne jamais retirer.
const PREFIXES_DYNAMIQUES = ['diff_', 'personality_', 'cat_']

const corriger = process.argv.includes('--fix')

function fichiersSource(dir, acc = []) {
  for (const entree of readdirSync(dir, { withFileTypes: true })) {
    const chemin = join(dir, entree.name)
    if (entree.isDirectory()) fichiersSource(chemin, acc)
    else if (/\.(js|jsx)$/.test(entree.name)) acc.push(chemin)
  }
  return acc
}

const tablesI18n = LANGS.map((l) => join(SRC, 'i18n', `${l}.js`))
const source = fichiersSource(SRC)
  .filter((f) => !tablesI18n.includes(f))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

const fr = readFileSync(join(SRC, 'i18n', 'fr.js'), 'utf8')
const cles = [...fr.matchAll(/^ {2}([a-zA-Z0-9_]+):/gm)].map((m) => m[1])

const orphelines = cles.filter((cle) => {
  if (PREFIXES_DYNAMIQUES.some((p) => cle.startsWith(p))) return false
  return !new RegExp(`['"\`]${cle}['"\`]`).test(source)
})

console.log(`${cles.length} clés déclarées, ${orphelines.length} orpheline(s).`)
orphelines.forEach((c) => console.log(`  · ${c}`))

if (!orphelines.length) process.exit(0)
if (!corriger) {
  console.log('\nRelance avec --fix pour les retirer des 4 langues.')
  process.exit(0)
}

for (const lang of LANGS) {
  const chemin = join(SRC, 'i18n', `${lang}.js`)
  const lignes = readFileSync(chemin, 'utf8').split('\n')
  const gardees = []
  let retirees = 0
  let i = 0
  while (i < lignes.length) {
    const debut = lignes[i].match(/^ {2}([a-zA-Z0-9_]+):/)
    if (debut && orphelines.includes(debut[1])) {
      // Une valeur peut tenir sur plusieurs lignes (chaînes longues) : on
      // avale jusqu'à la ligne qui termine l'entrée par une virgule.
      while (i < lignes.length && !/,\s*$/.test(lignes[i])) i++
      i++
      retirees++
      continue
    }
    gardees.push(lignes[i])
    i++
  }
  writeFileSync(chemin, gardees.join('\n'))
  console.log(`  ${relative(ROOT, chemin)} : ${retirees} clé(s) retirée(s)`)
}
