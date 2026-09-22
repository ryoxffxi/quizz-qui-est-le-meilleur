#!/usr/bin/env node
// Applique aux banques le contenu produit par l'atelier contenu du 2026-09-07
// (rédaction par lots + vérification adversariale), en ne gardant QUE les
// entrées approuvées par les vérificateurs.
//
// Entrées (dossier --in) :
//   route-<n>.json  : [{ id, theme, options[4], correct_text, explanation, changed, difficulty? }]
//   signs-<n>.json  : [{ id, code, short, alt, detail }]
//   expl-<prefixe>.json : [{ id, explanation: { fr, en, es, pt } }]
// Rejets (--reject) : { route: [ids], signs: [ids], expl: [ids] } (ids refusés par au
// moins un vérificateur : on garde alors la version d'origine).
//
// Usage : node scripts/apply-content-2026-09.mjs --in <dossier> --reject <fichier.json> [--dry]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const opt = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : def
}
const IN = opt('--in')
const REJECT = opt('--reject')
const DRY = args.includes('--dry')
if (!IN) {
  console.error('Usage : --in <dossier> [--reject <fichier.json>] [--dry]')
  process.exit(1)
}

const rejected = REJECT
  ? JSON.parse(fs.readFileSync(REJECT, 'utf8'))
  : { route: [], signs: [], expl: [] }
const rej = {
  route: new Set(rejected.route || []),
  signs: new Set(rejected.signs || []),
  expl: new Set(rejected.expl || []),
}

const EM_DASH = /—/
const files = fs.readdirSync(IN).filter((f) => f.endsWith('.json'))
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const writeJson = (p, data) => {
  if (DRY) return
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n')
}

const log = { route: [], signs: [], expl: [] }
const skip = (kind, id, why) => log[kind].push(`SKIP ${id} : ${why}`)

// --- 1. Code de la route ----------------------------------------------------
const routeFile = path.join(ROOT, 'src/content/code-route.json')
const route = readJson(routeFile)
const byId = new Map(route.map((q) => [q.id, q]))
let routeApplied = 0
let themed = 0
for (const f of files.filter((f) => f.startsWith('route-'))) {
  for (const e of readJson(path.join(IN, f))) {
    const q = byId.get(e.id)
    if (!q) {
      skip('route', e.id, 'question absente de la banque (supprimée)')
      continue
    }
    if (rej.route.has(e.id)) {
      skip('route', e.id, 'refusée par un vérificateur')
      continue
    }
    const opts = Array.isArray(e.options) ? e.options.map((s) => String(s).trim()) : null
    const valid =
      opts &&
      opts.length === 4 &&
      new Set(opts.map((s) => s.toLowerCase())).size === 4 &&
      typeof e.correct_text === 'string' &&
      opts.includes(e.correct_text.trim()) &&
      !opts.some((s) => EM_DASH.test(s)) &&
      !(e.explanation && EM_DASH.test(e.explanation))
    if (e.theme && typeof e.theme === 'string') {
      q.theme = e.theme
      themed += 1
    }
    if (!valid) {
      skip('route', e.id, 'options/correct_text invalides (thème seul appliqué)')
      continue
    }
    q.options = { fr: opts }
    q.correct = opts.indexOf(e.correct_text.trim())
    if (e.explanation && e.explanation.length >= 40) q.explanation = { fr: e.explanation.trim() }
    if (e.difficulty === 'facile' || e.difficulty === 'expert') q.difficulty = e.difficulty
    routeApplied += 1
  }
}
writeJson(routeFile, route)

// --- 2. Fiches panneaux → details.js ----------------------------------------
const detailsFile = path.join(ROOT, 'src/content/panneaux/details.js')
const details = {}
for (const f of files.filter((f) => f.startsWith('signs-'))) {
  for (const e of readJson(path.join(IN, f))) {
    if (!e.id) continue
    if (rej.signs.has(e.id)) {
      skip('signs', e.id, 'refusé par le vérificateur')
      continue
    }
    const d = {}
    if (e.short && typeof e.short === 'string' && e.short.length <= 40) d.short = e.short.trim()
    if (e.alt && typeof e.alt === 'string') d.alt = e.alt.trim()
    if (e.detail && typeof e.detail === 'string' && e.detail.length >= 80) d.detail = e.detail.trim()
    if (Object.values(d).some((v) => EM_DASH.test(v))) {
      skip('signs', e.id, 'tiret long')
      continue
    }
    if (Object.keys(d).length) details[e.id] = d
  }
}
if (Object.keys(details).length) {
  const body = Object.entries(details)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, d]) => `  ${JSON.stringify(id)}: ${JSON.stringify(d, null, 4).replace(/\n/g, '\n  ')},`)
    .join('\n')
  const src = `// Compléments de fiche par panneau (générés par scripts/apply-content-2026-09.mjs
// depuis l'atelier contenu du 2026-09-07, après vérification adversariale).
//   short  : libellé court pour les titres (≤ 35 caractères)
//   alt    : description neutre (forme, couleur, picto) sans révéler le nom
//   detail : 2-3 phrases : où on le rencontre, ce qu'il impose, le piège d'examen
// Fusionné dans SIGNS par src/content/panneaux/signs.js. Pas de tiret long.
export const DETAILS = {
${body}
}
`
  if (!DRY) fs.writeFileSync(detailsFile, src)
}

// --- 3. Explications courtes (culture / cinéma / manga) ---------------------
const BANKS = { culture: 'culture-generale', cinema: 'cinema-series', manga: 'manga-anime' }
let explApplied = 0
for (const f of files.filter((f) => f.startsWith('expl-'))) {
  const prefix = f.slice(5, -5)
  const bankName = BANKS[prefix]
  if (!bankName) continue
  const bankFile = path.join(ROOT, `src/content/${bankName}.json`)
  const bank = readJson(bankFile)
  const map = new Map(bank.map((q) => [q.id, q]))
  for (const e of readJson(path.join(IN, f))) {
    const q = map.get(e.id)
    if (!q) {
      skip('expl', e.id, 'question absente (supprimée)')
      continue
    }
    if (rej.expl.has(e.id)) {
      skip('expl', e.id, 'refusée par le vérificateur')
      continue
    }
    const ex = e.explanation || {}
    const langs = ['fr', 'en', 'es', 'pt']
    const ok = langs.every((l) => typeof ex[l] === 'string' && ex[l].length >= 40 && !EM_DASH.test(ex[l]))
    if (!ok) {
      skip('expl', e.id, 'explication incomplète (4 langues ≥ 40 caractères attendues)')
      continue
    }
    q.explanation = Object.fromEntries(langs.map((l) => [l, ex[l].trim()]))
    explApplied += 1
  }
  writeJson(bankFile, bank)
}

// --- Bilan ------------------------------------------------------------------
console.log(`${DRY ? '[simulation] ' : ''}code-route : ${routeApplied} questions mises à jour, ${themed} thèmes posés`)
console.log(`panneaux   : ${Object.keys(details).length} fiches complétées`)
console.log(`explications : ${explApplied} réécrites`)
for (const kind of Object.keys(log)) {
  if (log[kind].length) {
    console.log(`\n${kind} : ${log[kind].length} entrées ignorées`)
    for (const line of log[kind].slice(0, 40)) console.log('  ' + line)
    if (log[kind].length > 40) console.log(`  … (${log[kind].length - 40} de plus)`)
  }
}
