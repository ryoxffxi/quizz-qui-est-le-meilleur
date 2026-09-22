#!/usr/bin/env node
// Rapport d'usage : compteurs (jour UTC, événement, contexte) de la table D1
// `events`, alimentée par POST /api/ev. Aucune donnée personnelle dedans.
//
//   npm run events                 -> 14 derniers jours, base distante (prod)
//   npm run events -- --days 30    -> fenêtre plus large
//   npm run events -- --local      -> base locale de `wrangler dev`
//
// Nécessite wrangler connecté (`npx wrangler login`).
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const DB_NAME = 'quizz-premium'
export const DEFAULT_DAYS = 14

export function parseArgs(argv) {
  const out = { days: DEFAULT_DAYS, local: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--local') out.local = true
    else if (a === '--days') {
      const n = Number(argv[++i])
      if (Number.isInteger(n) && n >= 1 && n <= 366) out.days = n
    } else if (a.startsWith('--days=')) {
      const n = Number(a.slice(7))
      if (Number.isInteger(n) && n >= 1 && n <= 366) out.days = n
    }
  }
  return out
}

// Fenêtre de `days` jours INCLUANT aujourd'hui (UTC, comme le Worker).
export function buildQuery(days = DEFAULT_DAYS) {
  const back = Math.max(0, days - 1)
  return `SELECT day, name, ctx, n FROM events WHERE day >= date('now', '-${back} days') ORDER BY day, name, n DESC`
}

// `wrangler d1 execute --json` imprime un tableau de résultats ; on tolère une
// bannière avant le JSON et on aplatit tous les jeux de résultats.
export function parseWranglerJson(stdout) {
  const text = String(stdout || '')
  const start = Math.min(...['[', '{'].map((c) => text.indexOf(c)).filter((i) => i >= 0))
  if (!Number.isFinite(start)) return []
  const parsed = JSON.parse(text.slice(start))
  const sets = Array.isArray(parsed) ? parsed : [parsed]
  return sets.flatMap((s) => (s && Array.isArray(s.results) ? s.results : []))
}

// Liste des jours 'YYYY-MM-DD' de la fenêtre, du plus ancien au plus récent.
export function dayRange(days, today = new Date()) {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    out.push(new Date(end.getTime() - i * 86400000).toISOString().slice(0, 10))
  }
  return out
}

// Tableau lisible : une ligne par événement (total puis série par jour), puis
// les contextes les plus fréquents par événement.
export function formatReport(rows, { days = DEFAULT_DAYS, today = new Date() } = {}) {
  const dayList = dayRange(days, today)
  const first = dayList[0]
  const last = dayList[dayList.length - 1]
  const lines = [`Usage des ${days} derniers jours (jours UTC), du ${first} au ${last}`]
  const clean = rows
    .map((r) => ({ day: String(r.day), name: String(r.name), ctx: r.ctx == null ? '' : String(r.ctx), n: Number(r.n) || 0 }))
    .filter((r) => r.n > 0 && dayList.includes(r.day))
  if (clean.length === 0) {
    lines.push('Aucun événement sur la période.')
    return lines.join('\n')
  }

  const byEvent = new Map()
  for (const r of clean) {
    if (!byEvent.has(r.name)) byEvent.set(r.name, { total: 0, perDay: new Map(), ctx: new Map() })
    const e = byEvent.get(r.name)
    e.total += r.n
    e.perDay.set(r.day, (e.perDay.get(r.day) || 0) + r.n)
    if (r.ctx) e.ctx.set(r.ctx, (e.ctx.get(r.ctx) || 0) + r.n)
  }
  const events = [...byEvent.entries()].sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))
  const nameW = Math.max(10, ...events.map(([n]) => n.length))
  const cellW = Math.max(2, ...events.flatMap(([, e]) => [...e.perDay.values()]).map((v) => String(v).length))
  const grand = events.reduce((s, [, e]) => s + e.total, 0)

  lines.push('')
  lines.push(`${'Événement'.padEnd(nameW)}  ${'Total'.padStart(7)}  Par jour (ancien -> récent)`)
  lines.push(`${'-'.repeat(nameW)}  ${'-'.repeat(7)}  ${'-'.repeat(dayList.length * (cellW + 1) - 1)}`)
  for (const [name, e] of events) {
    const series = dayList.map((d) => String(e.perDay.get(d) || 0).padStart(cellW)).join(' ')
    lines.push(`${name.padEnd(nameW)}  ${String(e.total).padStart(7)}  ${series}`)
  }
  lines.push(`${'Total'.padEnd(nameW)}  ${String(grand).padStart(7)}`)

  const withCtx = events.filter(([, e]) => e.ctx.size > 0)
  if (withCtx.length > 0) {
    lines.push('')
    lines.push('Contextes (5 premiers par événement)')
    for (const [name, e] of withCtx) {
      const top = [...e.ctx.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([c, n]) => `${c} ${n}`)
        .join(' · ')
      lines.push(`${name.padEnd(nameW)}  ${top}`)
    }
  }
  return lines.join('\n')
}

// Interroge D1 via wrangler (sans shell : aucun problème d'échappement).
export function fetchRows({ days, local }) {
  const args = ['wrangler', 'd1', 'execute', DB_NAME, local ? '--local' : '--remote', '--yes', '--json', '--command', buildQuery(days)]
  const stdout = execFileSync('npx', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return parseWranglerJson(stdout)
}

function main() {
  const opts = parseArgs(process.argv.slice(2))
  let rows
  try {
    rows = fetchRows(opts)
  } catch (e) {
    const detail = String((e && e.stderr) || (e && e.message) || e)
    if (/no such table/i.test(detail)) {
      console.log('Aucun événement encore : la table `events` n’existe pas (elle naît au premier /api/ev).')
      return
    }
    console.error('Lecture D1 impossible (wrangler connecté ? `npx wrangler login`).')
    console.error(detail.trim())
    process.exitCode = 1
    return
  }
  console.log(formatReport(rows, { days: opts.days }))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
