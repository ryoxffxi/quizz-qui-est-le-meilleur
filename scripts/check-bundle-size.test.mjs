// Tests du garde-fou de taille du bundle d'accueil, sur un dossier temporaire.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_MAX, checkBundleSize } from './check-bundle-size.mjs'

let dir
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = undefined
})

describe('checkBundleSize', () => {
  it('accepte un bundle sous la limite et refuse au-dessus', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'quizzo-size-'))
    writeFileSync(path.join(dir, 'index-abc123.js'), 'x'.repeat(1000))
    writeFileSync(path.join(dir, 'code-route-def456.js'), 'x'.repeat(5000))
    expect(checkBundleSize({ assetsDir: dir, max: 1000 })).toEqual({
      file: 'index-abc123.js',
      size: 1000,
      max: 1000,
      ok: true,
    })
    expect(checkBundleSize({ assetsDir: dir, max: 999 }).ok).toBe(false)
  })

  it('lève si le build manque', () => {
    dir = mkdtempSync(path.join(tmpdir(), 'quizzo-size-'))
    expect(() => checkBundleSize({ assetsDir: path.join(dir, 'absent') })).toThrow(/introuvable/)
    expect(() => checkBundleSize({ assetsDir: dir })).toThrow(/aucun bundle/)
  })

  it('la limite par défaut est 300 000 octets', () => {
    expect(DEFAULT_MAX).toBe(300_000)
  })
})
