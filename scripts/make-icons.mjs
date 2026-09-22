#!/usr/bin/env node
// Génère les icônes PNG de l'app (public/icons/) : pastille lime + « Q » en
// Space Grotesk 700 (police auto-hébergée public/fonts, inlinée en base64),
// rendue par Chrome headless à 512 px puis réduite par sips.
//   node scripts/make-icons.mjs [--out public/icons] [--tmp <dossier>]
// Produit exactement (voir public/manifest.webmanifest et index.html) :
//   icon-512.png / icon-192.png   : usage « any », coins transparents ;
//   icon-maskable-512.png         : usage « maskable », fond #0a0d16 plein,
//                                   pastille dans la zone sûre (80 %) ;
//   apple-touch-icon.png (180)    : plein cadre lime, iOS arrondit lui-même.
// Sans Chrome, repli sur rsvg-convert avec le Q géométrique du favicon.
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const FONT = join(ROOT, 'public', 'fonts', 'space-grotesk-latin.woff2')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const RSVG = '/opt/homebrew/bin/rsvg-convert'

// Couleurs de marque (tokens volt de src/index.css).
export const BG = '#0a0d16'
export const LIME = '#d8ff3d'
export const INK = '#10140a'

// Fichiers produits : nom, taille finale, variante de rendu, source 512 px.
export const ICONS = [
  { file: 'icon-512.png', size: 512, variant: 'any' },
  { file: 'icon-192.png', size: 192, variant: 'any' },
  { file: 'icon-maskable-512.png', size: 512, variant: 'maskable' },
  { file: 'apple-touch-icon.png', size: 180, variant: 'apple' },
]

// Géométrie d'une variante sur un canevas de 512 px : fond, taille et rayon
// de la pastille, corps de la lettre.
export function layout(variant) {
  if (variant === 'maskable') {
    // Zone sûre = cercle de 80 % (rayon 205 px) : une pastille de 316 px aux
    // coins très arrondis y tient entièrement.
    return { canvas: 512, bg: BG, tile: 316, radius: 72, font: 214, lift: 6 }
  }
  if (variant === 'apple') {
    return { canvas: 512, bg: LIME, tile: 512, radius: 0, font: 346, lift: 10 }
  }
  return { canvas: 512, bg: 'transparent', tile: 512, radius: 112, font: 346, lift: 10 }
}

// Page HTML rendue par Chrome : la police est inlinée pour ne dépendre
// d'aucun serveur ni d'aucune règle file://.
export function buildHtml(variant, fontBase64) {
  const l = layout(variant)
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Space Grotesk';
    src: url(data:font/woff2;base64,${fontBase64}) format('woff2');
    font-weight: 500 700;
  }
  html, body { margin: 0; width: ${l.canvas}px; height: ${l.canvas}px; overflow: hidden; }
  body { background: ${l.bg}; display: grid; place-items: center; }
  .tile {
    width: ${l.tile}px; height: ${l.tile}px; border-radius: ${l.radius}px;
    background: ${LIME}; color: ${INK};
    display: grid; place-items: center;
    font-family: 'Space Grotesk', sans-serif; font-weight: 700;
    font-size: ${l.font}px; line-height: 1;
    -webkit-font-smoothing: antialiased;
  }
  /* La lettre est optiquement plus basse que son cadre de ligne : on la relève. */
  .tile span { display: block; transform: translateY(-${l.lift}px); }
</style></head>
<body><div class="tile"><span>Q</span></div></body></html>`
}

// Repli vectoriel (sans webfont) : le Q géométrique du favicon, mis à l'échelle.
export function buildFallbackSvg(variant) {
  const l = layout(variant)
  const c = l.canvas
  const off = (c - l.tile) / 2
  const s = l.tile / 64 // le favicon est dessiné dans un carré de 64
  const bg = l.bg === 'transparent' ? '' : `<rect width="${c}" height="${c}" fill="${l.bg}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c} ${c}">
${bg}
<g transform="translate(${off} ${off}) scale(${s})">
  <rect width="64" height="64" rx="${l.radius / s}" fill="${LIME}"/>
  <path fill="${INK}" fill-rule="evenodd" d="M32 12.5a17.5 17.5 0 1 0 0 35 17.5 17.5 0 0 0 0-35zm0 7.6a9.9 9.9 0 1 1 0 19.8 9.9 9.9 0 0 1 0-19.8z"/>
  <path d="M38 36.5 48 47" fill="none" stroke="${INK}" stroke-width="7.6" stroke-linecap="round"/>
</g>
</svg>`
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Capture d'écran Chrome headless. Chrome 152 (headless=new) écrit bien le PNG
// mais ne quitte pas toujours après --screenshot : on attend le fichier (taille
// stable), puis on termine le processus nous-mêmes.
async function chromeScreenshot(htmlPath, outPng, profileDir) {
  const child = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      `--user-data-dir=${profileDir}`,
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      '--window-size=512,512',
      '--virtual-time-budget=4000',
      `--screenshot=${outPng}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: 'ignore' },
  )
  let exited = false
  child.on('exit', () => {
    exited = true
  })
  const deadline = Date.now() + 60000
  let lastSize = -1
  try {
    while (Date.now() < deadline) {
      await sleep(250)
      if (existsSync(outPng)) {
        const size = statSync(outPng).size
        if (size > 0 && size === lastSize) return
        lastSize = size
      } else if (exited) {
        throw new Error('Chrome a quitté sans produire la capture.')
      }
    }
    throw new Error(`Chrome n'a pas produit ${outPng} en 60 s.`)
  } finally {
    if (!exited) {
      child.kill('SIGTERM')
      await sleep(300)
      if (!exited) child.kill('SIGKILL')
    }
  }
}

// Rend une variante en PNG 512 px avec Chrome (ou rsvg-convert en repli).
async function render512(variant, outPng, tmp, fontBase64) {
  if (existsSync(CHROME)) {
    const html = join(tmp, `${variant}.html`)
    writeFileSync(html, buildHtml(variant, fontBase64))
    await chromeScreenshot(html, outPng, join(tmp, 'profile'))
    return 'chrome'
  }
  if (existsSync(RSVG)) {
    const svg = join(tmp, `${variant}.svg`)
    writeFileSync(svg, buildFallbackSvg(variant))
    execFileSync(RSVG, ['-w', '512', '-h', '512', '-o', outPng, svg], { stdio: 'ignore' })
    return 'rsvg'
  }
  throw new Error('Ni Google Chrome ni rsvg-convert disponibles : impossible de rendre les icônes.')
}

// Redimensionne un PNG avec sips (macOS), en conservant le format PNG.
function resize(src, dest, size) {
  execFileSync('/usr/bin/sips', ['-s', 'format', 'png', '-z', String(size), String(size), src, '--out', dest], {
    stdio: 'ignore',
  })
}

// Dimensions d'un PNG (IHDR), pour la vérification finale et les tests.
export function pngSize(file) {
  const buf = readFileSync(file)
  if (buf.length < 24 || buf.toString('latin1', 1, 4) !== 'PNG') return null
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

export async function main(argv = process.argv.slice(2)) {
  const outIdx = argv.indexOf('--out')
  const tmpIdx = argv.indexOf('--tmp')
  const outDir = resolve(ROOT, outIdx >= 0 ? argv[outIdx + 1] : 'public/icons')
  const tmpBase = tmpIdx >= 0 ? resolve(argv[tmpIdx + 1]) : tmpdir()
  mkdirSync(outDir, { recursive: true })
  mkdirSync(tmpBase, { recursive: true })
  const tmp = mkdtempSync(join(tmpBase, 'quizz-icons-'))
  const fontBase64 = existsSync(FONT) ? readFileSync(FONT).toString('base64') : ''
  if (!fontBase64) console.warn(`Police absente (${FONT}) : la lettre sera rendue en police système.`)

  try {
    const sources = {}
    for (const variant of ['any', 'maskable', 'apple']) {
      const png = join(tmp, `${variant}-512.png`)
      const engine = await render512(variant, png, tmp, fontBase64)
      sources[variant] = png
      console.log(`rendu ${variant} (${engine})`)
    }
    for (const icon of ICONS) {
      const dest = join(outDir, icon.file)
      resize(sources[icon.variant], dest, icon.size)
      const dim = pngSize(dest)
      if (!dim || dim.width !== icon.size || dim.height !== icon.size) {
        throw new Error(`${icon.file} : taille inattendue ${JSON.stringify(dim)}`)
      }
      console.log(`${icon.file}  ${dim.width}x${dim.height}`)
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}
