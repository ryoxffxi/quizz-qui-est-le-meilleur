// Garde-fou : le bundle d'ACCUEIL (dist/assets/index-*.js), téléchargé par tout
// le monde, doit rester sous BUNDLE_MAX octets. S'il grimpe, c'est presque
// toujours qu'une banque de questions ou un écran de jeu est repassé en import
// statique (les écrans sont paresseux : src/lib/screens.js).
//
// Mesure du 07/09/2026 après la mise en paresse : 297 895 octets (plus un
// chunk partagé i18n-*.js de ~84 kB en modulepreload, hors de cette mesure).
//
//   node scripts/check-bundle-size.mjs            → 300 000 octets par défaut
//   BUNDLE_MAX=350000 node scripts/check-bundle-size.mjs
//
// Sort avec le code 1 si la limite est dépassée (CI). Lancé après build-pages
// dans `npm run build` (script npm `size`).
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_MAX = 300_000

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Renvoie { file, size, max, ok } pour le bundle d'accueil de `assetsDir`.
// Lève si le dossier ou le bundle manque (build absent).
export function checkBundleSize({ assetsDir = path.join(ROOT, 'dist/assets'), max = DEFAULT_MAX } = {}) {
  if (!existsSync(assetsDir)) throw new Error(`${assetsDir} introuvable : lancer \`vite build\` d’abord.`)
  const file = readdirSync(assetsDir).find((f) => /^index-.*\.js$/.test(f))
  if (!file) throw new Error(`aucun bundle index-*.js dans ${assetsDir}.`)
  const size = statSync(path.join(assetsDir, file)).size
  return { file, size, max, ok: size <= max }
}

function main() {
  const max = Number(process.env.BUNDLE_MAX) || DEFAULT_MAX
  let result
  try {
    result = checkBundleSize({ max })
  } catch (e) {
    console.error('check-bundle-size :', e.message)
    process.exit(1)
  }
  const kb = (n) => `${(n / 1000).toFixed(1)} kB`
  if (!result.ok) {
    console.error(
      `check-bundle-size : ${result.file} pèse ${kb(result.size)}, limite ${kb(result.max)}. Une banque de questions est-elle importée statiquement ?`,
    )
    process.exit(1)
  }
  console.log(`check-bundle-size : ${result.file} ${kb(result.size)} (limite ${kb(result.max)}).`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
