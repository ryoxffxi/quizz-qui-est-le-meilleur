// Planche-contact des panneaux : génère un HTML statique avec tous les SVG
// pour contrôle visuel (usage : node scripts/panneaux-sheet.mjs <sortie.html>).
// Signale aussi les panneaux sans description `alt` (details.js).
import { writeFileSync } from 'node:fs'
import { FAMILIES, SIGNS } from '../src/content/panneaux/signs.js'

const out = process.argv[2] || 'panneaux-sheet.html'

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const cells = FAMILIES.map((fam) => {
  const signs = SIGNS.filter((s) => s.family === fam.id)
  const grid = signs
    .map(
      (s) => `
      <figure${s.alt ? '' : ' class="no-alt"'}>
        <div class="sign">${s.svg}</div>
        <figcaption><b>${esc(s.code)}</b> · ${esc(s.id)}<br>${esc(s.short || s.name)}${
          s.alt ? '' : '<br><em>sans alt</em>'
        }</figcaption>
      </figure>`,
    )
    .join('')
  return `<h2>${fam.emoji} ${esc(fam.label)} (${signs.length})</h2><div class="grid">${grid}</div>`
}).join('')

writeFileSync(
  out,
  `<!doctype html><meta charset="utf-8"><title>Planche panneaux</title><style>
  body{background:#0b0f1a;color:#e8ecf4;font:14px -apple-system,sans-serif;margin:24px}
  h2{margin:28px 0 12px}
  .grid{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
  figure{margin:0;background:#161c2c;border-radius:12px;padding:12px;text-align:center}
  figure.no-alt{outline:2px solid #f59e0b}
  .sign svg{width:100%;height:auto;display:block}
  figcaption{margin-top:8px;font-size:12px;color:#9aa6be}
  </style><body>${cells}`,
)
const sansAlt = SIGNS.filter((s) => !s.alt).map((s) => s.id)
console.log(`${SIGNS.length} panneaux -> ${out}`)
if (sansAlt.length) console.log(`sans alt : ${sansAlt.join(', ')}`)
