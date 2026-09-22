import { describe, it, expect } from 'vitest'
import { buildPairs, check, contrast, parseTokens } from './check-contrast.mjs'

describe('check-contrast', () => {
  it('calcule le ratio WCAG (noir/blanc = 21, identique = 1, symétrique)', () => {
    expect(contrast('#000', '#fff')).toBeCloseTo(21, 5)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
    expect(contrast('#ff4155', '#141927')).toBeCloseTo(contrast('#141927', '#ff4155'), 10)
    // Blanc sur crimson : le constat de départ (3,4:1, sous AA).
    expect(contrast('#ffffff', '#ff4155')).toBeLessThan(4.5)
  })

  it('lit les tokens volt et crimson dans index.css', () => {
    const { volt, crimson } = parseTokens()
    expect(volt.accent).toBe('#d8ff3d')
    expect(crimson.accent).toBe('#ff4155')
    expect(crimson['accent-ink']).toBe('#1c0609')
    expect(Object.keys(volt).filter((k) => k.startsWith('hue-'))).toHaveLength(5)
    expect(volt.surface).toBe(crimson.surface)
  })

  it('tous les couples de tokens passent leur seuil (AA)', () => {
    const rows = check()
    expect(rows.length).toBeGreaterThanOrEqual(20)
    const bad = rows.filter((r) => !r.ok).map((r) => `${r.label} ${r.ratio.toFixed(2)}`)
    expect(bad).toEqual([])
  })

  it('signale un couple sous le seuil sur des tokens fictifs', () => {
    const tokens = parseTokens(
      ":root { --accent: #ff4155; --accent-ink: #ffffff; --surface: #141927; } :root[data-theme='crimson'] { --accent: #ff4155; }",
    )
    const rows = buildPairs(tokens)
    expect(rows.length).toBeGreaterThan(0)
    const [label, fg, bg] = rows[0]
    expect(label).toContain('encre sur accent')
    expect(contrast(fg, bg)).toBeLessThan(4.5)
  })
})
