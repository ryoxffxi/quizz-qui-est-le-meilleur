#!/usr/bin/env node
// Vérifie par calcul (WCAG 2.x) les contrastes des tokens de src/index.css :
// encre sur accent (CTA), textes sur surfaces, teintes de catégorie utilisées
// en texte. Sort en erreur si un couple passe sous son seuil.
//   node scripts/check-contrast.mjs          -> tableau + code de sortie
// Les fonctions sont exportées pour scripts/check-contrast.test.mjs.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSS_PATH = join(__dirname, '..', 'src', 'index.css')

// '#rgb' ou '#rrggbb' -> [r, g, b] (0-255).
export function hexToRgb(hex) {
  const h = String(hex).trim().replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Couleur hexadécimale invalide : ${hex}`)
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Luminance relative (sRGB linéarisé), WCAG 2.x.
export function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

// Ratio de contraste (1 à 21) entre deux couleurs hexadécimales opaques.
export function contrast(a, b) {
  const la = luminance(hexToRgb(a))
  const lb = luminance(hexToRgb(b))
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

// Extrait les tokens hexadécimaux d'un bloc CSS ({ nom: '#rrggbb' }).
function tokensOf(block) {
  const out = {}
  for (const m of block.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-f]{3,6})\b/gi)) out[m[1]] = m[2]
  return out
}

// Lit :root (volt) et :root[data-theme='crimson'] dans index.css.
export function parseTokens(css = readFileSync(CSS_PATH, 'utf8')) {
  const root = css.match(/:root\s*\{([^}]*)\}/)
  const crimson = css.match(/:root\[data-theme='crimson'\]\s*\{([^}]*)\}/)
  if (!root) throw new Error(':root introuvable dans index.css')
  const volt = tokensOf(root[1])
  return { volt, crimson: { ...volt, ...tokensOf(crimson ? crimson[1] : '') } }
}

// Couples à vérifier : [libellé, premier plan, arrière-plan, seuil].
// 4,5 = texte normal (AA) ; 3 = grands textes et composants d'interface.
export function buildPairs({ volt, crimson }) {
  const pairs = [
    ['volt : encre sur accent (CTA)', volt['accent-ink'], volt.accent, 4.5],
    ['crimson : encre sur accent (CTA)', crimson['accent-ink'], crimson.accent, 4.5],
    ['volt : accent en texte sur surface', volt.accent, volt.surface, 4.5],
    ['crimson : accent en texte sur surface', crimson.accent, crimson.surface, 4.5],
    ['crimson : accent-soft en texte sur surface', crimson['accent-soft'], crimson.surface, 4.5],
    ['volt : accent-soft en texte sur surface', volt['accent-soft'], volt.surface, 4.5],
    ['texte sur fond', volt.text, volt.bg, 4.5],
    ['texte sur surface', volt.text, volt.surface, 4.5],
    ['texte sur surface-2', volt.text, volt['surface-2'], 4.5],
    ['texte atténué sur fond', volt['text-dim'], volt.bg, 4.5],
    ['texte atténué sur surface', volt['text-dim'], volt.surface, 4.5],
    ['texte atténué sur surface-2', volt['text-dim'], volt['surface-2'], 4.5],
    ['encre sur bonne réponse', volt['good-ink'], volt.good, 4.5],
    ['encre sur mauvaise réponse', volt['bad-ink'], volt.bad, 4.5],
    ['bonne réponse en texte sur surface', volt.good, volt.surface, 4.5],
    ['mauvaise réponse en texte sur surface', volt.bad, volt.surface, 4.5],
    ['avertissement en texte sur surface', volt.warn, volt.surface, 4.5],
  ]
  for (const key of Object.keys(volt).filter((k) => k.startsWith('hue-'))) {
    pairs.push([`teinte ${key.slice(4)} en texte sur surface`, volt[key], volt.surface, 4.5])
  }
  return pairs.filter((p) => p[1] && p[2])
}

export function check(tokens = parseTokens()) {
  return buildPairs(tokens).map(([label, fg, bg, min]) => {
    const ratio = contrast(fg, bg)
    return { label, fg, bg, min, ratio, ok: ratio >= min }
  })
}

// Ligne de commande.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const rows = check()
  const width = Math.max(...rows.map((r) => r.label.length))
  for (const r of rows) {
    const mark = r.ok ? 'OK ' : 'KO '
    console.log(`${mark} ${r.label.padEnd(width)}  ${r.fg} / ${r.bg}  ${r.ratio.toFixed(2)}:1  (min ${r.min})`)
  }
  const bad = rows.filter((r) => !r.ok)
  console.log(bad.length ? `\n${bad.length} couple(s) sous le seuil.` : '\nTous les couples passent.')
  process.exit(bad.length ? 1 : 0)
}
