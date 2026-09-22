import { describe, it, expect } from 'vitest'
import { parseArgs, buildQuery, parseWranglerJson, dayRange, formatReport } from './events-report.mjs'

describe('parseArgs', () => {
  it('lit --days (deux formes) et --local, avec des bornes sûres', () => {
    expect(parseArgs([])).toEqual({ days: 14, local: false })
    expect(parseArgs(['--days', '30', '--local'])).toEqual({ days: 30, local: true })
    expect(parseArgs(['--days=7'])).toEqual({ days: 7, local: false })
    expect(parseArgs(['--days', '0'])).toEqual({ days: 14, local: false })
    expect(parseArgs(['--days', 'abc'])).toEqual({ days: 14, local: false })
    expect(parseArgs(['--days', '999'])).toEqual({ days: 14, local: false })
  })
})

describe('buildQuery', () => {
  it('couvre exactement N jours en incluant aujourd’hui', () => {
    expect(buildQuery(14)).toContain("date('now', '-13 days')")
    expect(buildQuery(1)).toContain("date('now', '-0 days')")
    expect(buildQuery()).toMatch(/^SELECT day, name, ctx, n FROM events WHERE/)
  })
})

describe('parseWranglerJson', () => {
  it('aplatit les jeux de résultats et tolère une bannière avant le JSON', () => {
    const out = ` ⛅️ wrangler 4.0.0\n[{"results":[{"day":"2026-09-07","name":"share","ctx":"","n":3}],"success":true,"meta":{}}]`
    expect(parseWranglerJson(out)).toEqual([{ day: '2026-09-07', name: 'share', ctx: '', n: 3 }])
    expect(parseWranglerJson('{"results":[{"day":"d","name":"n","ctx":"c","n":1}]}')).toHaveLength(1)
    expect(parseWranglerJson('')).toEqual([])
    expect(parseWranglerJson('[]')).toEqual([])
    expect(parseWranglerJson('[{"success":true}]')).toEqual([])
  })
})

describe('dayRange', () => {
  it('rend N jours UTC finissant aujourd’hui, du plus ancien au plus récent', () => {
    const today = new Date(Date.UTC(2026, 8, 7, 23, 30))
    expect(dayRange(3, today)).toEqual(['2026-09-05', '2026-09-06', '2026-09-07'])
    expect(dayRange(1, today)).toEqual(['2026-09-07'])
    // Passage de mois.
    expect(dayRange(2, new Date(Date.UTC(2026, 9, 1)))).toEqual(['2026-09-30', '2026-10-01'])
  })
})

describe('formatReport', () => {
  const today = new Date(Date.UTC(2026, 8, 7))
  const rows = [
    { day: '2026-09-05', name: 'solo_start', ctx: 'code-route', n: 10 },
    { day: '2026-09-06', name: 'solo_start', ctx: 'code-route', n: 5 },
    { day: '2026-09-06', name: 'solo_start', ctx: 'panneaux', n: 2 },
    { day: '2026-09-07', name: 'share', ctx: '', n: 4 },
    { day: '2026-09-07', name: 'solo_start', ctx: 'manga-anime', n: 1 },
    // Hors fenêtre : ignoré.
    { day: '2026-08-01', name: 'share', ctx: '', n: 99 },
  ]

  it('trie par total, aligne la série par jour et liste les contextes', () => {
    const text = formatReport(rows, { days: 3, today })
    const lines = text.split('\n')
    expect(lines[0]).toBe('Usage des 3 derniers jours (jours UTC), du 2026-09-05 au 2026-09-07')
    expect(text).toContain('Événement')
    const solo = lines.find((l) => l.startsWith('solo_start'))
    const share = lines.find((l) => l.startsWith('share'))
    expect(solo).toMatch(/solo_start\s+18\s+10\s+7\s+1$/)
    expect(share).toMatch(/share\s+4\s+0\s+0\s+4$/)
    expect(lines.indexOf(solo)).toBeLessThan(lines.indexOf(share))
    expect(text).toContain('Total')
    expect(text).toMatch(/Total\s+22/)
    expect(text).toContain('Contextes (5 premiers par événement)')
    expect(text).toContain('code-route 15 · panneaux 2 · manga-anime 1')
    expect(text).not.toContain('99')
  })

  it('signale une période vide', () => {
    expect(formatReport([], { days: 14, today })).toContain('Aucun événement sur la période.')
    expect(formatReport([{ day: '2020-01-01', name: 'share', ctx: '', n: 1 }], { days: 14, today })).toContain('Aucun événement')
  })
})
