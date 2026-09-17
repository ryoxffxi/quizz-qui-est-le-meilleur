import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BG, ICONS, LIME, buildFallbackSvg, buildHtml, layout, pngSize } from './make-icons.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ICON_DIR = join(ROOT, 'public', 'icons')

describe('make-icons', () => {
  it('les 4 fichiers attendus par index.html et le manifeste existent aux bonnes tailles', () => {
    for (const icon of ICONS) {
      const file = join(ICON_DIR, icon.file)
      expect(existsSync(file), icon.file).toBe(true)
      expect(pngSize(file)).toEqual({ width: icon.size, height: icon.size })
    }
    expect(ICONS.map((i) => i.file).sort()).toEqual(
      ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
    )
  })

  it('le manifeste référence exactement ces icônes, avec les champs PWA attendus', () => {
    const manifest = JSON.parse(readFileSync(join(ROOT, 'public', 'manifest.webmanifest'), 'utf8'))
    expect(manifest).toMatchObject({
      id: '/',
      name: 'Quizz - Qui est le meilleur ?',
      short_name: 'Quizz',
      start_url: '/?source=pwa',
      scope: '/',
      display: 'standalone',
      background_color: BG,
      theme_color: BG,
      lang: 'fr',
      categories: ['education', 'games'],
    })
    const srcs = manifest.icons.map((i) => i.src)
    expect(srcs).toEqual(['/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png'])
    for (const entry of manifest.icons) {
      const file = join(ROOT, 'public', entry.src)
      const [w, h] = entry.sizes.split('x').map(Number)
      expect(pngSize(file)).toEqual({ width: w, height: h })
    }
    expect(manifest.icons.find((i) => i.src.includes('maskable')).purpose).toBe('maskable')
  })

  it('la pastille maskable tient dans la zone sûre (cercle de 80 %)', () => {
    const l = layout('maskable')
    const half = l.tile / 2
    const farthest = (half - l.radius) * Math.SQRT2 + l.radius
    expect(farthest).toBeLessThanOrEqual(l.canvas * 0.4)
    expect(l.bg).toBe(BG)
  })

  it('la page HTML inline la police et pose les couleurs de marque', () => {
    const html = buildHtml('any', 'QUJD')
    expect(html).toContain("font-family: 'Space Grotesk'")
    expect(html).toContain('data:font/woff2;base64,QUJD')
    expect(html).toContain(LIME)
    expect(html).toContain('>Q<')
    expect(buildHtml('apple', '')).toContain(`background: ${LIME}`)
  })

  it('le repli vectoriel dessine le Q géométrique du favicon', () => {
    const svg = buildFallbackSvg('maskable')
    expect(svg).toContain(`fill="${BG}"`)
    expect(svg).toContain('fill-rule="evenodd"')
    expect(buildFallbackSvg('any')).not.toContain(`fill="${BG}"`)
  })
})
