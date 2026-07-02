// Planche-contact des panneaux : génère un HTML statique avec tous les SVG
// pour contrôle visuel (usage : node scripts/panneaux-sheet.mjs <sortie.html>).
import { writeFileSync } from 'node:fs'
import { FAMILIES, SIGNS } from '../src/content/panneaux/signs.js'

const out = process.argv[2] || 'panneaux-sheet.html'

const cells = FAMILIES.map((fam) => {
  const signs = SIGNS.filter((s) => s.family === fam.id)
  const grid = signs
    .map(
      (s) => `
      <figure>
        <div class="sign">${s.svg}</div>
        <figcaption><b>${s.code}</b> · ${s.id}<br>${s.name}</figcaption>
      </figure>`,
    )
    .join('')
  return `<h2>${fam.emoji} ${fam.label} (${signs.length})</h2><div class="grid">${grid}</div>`
}).join('')

writeFileSync(
  out,
  `<!doctype html><meta charset="utf-8"><style>
  body{background:#0b0f1a;color:#e8ecf4;font:14px -apple-system,sans-serif;margin:24px}
  h2{margin:28px 0 12px}
  .grid{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
  figure{margin:0;background:#161c2c;border-radius:12px;padding:12px;text-align:center}
  .sign svg{width:100%;height:auto;display:block}
  figcaption{margin-top:8px;font-size:12px;color:#9aa6be}
  </style><body>${cells}`,
)
console.log(`${SIGNS.length} panneaux -> ${out}`)
