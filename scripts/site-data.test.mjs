// Tests des helpers purs de site-data.mjs et de la coquille d'accueil.
import { describe, expect, it } from 'vitest'
import {
  APP,
  CATS,
  EXAM_FAQ,
  EXAM_THEMES,
  autoLink,
  clip,
  esc,
  fill,
  fmt,
  lastmodOf,
  readCounts,
  renderHomeShell,
  stripTags,
  totalQuestions,
  wordCount,
} from './site-data.mjs'

const DASH = '—'

describe('helpers', () => {
  it('esc échappe les cinq caractères HTML', () => {
    expect(esc(`<a href="x">l'&</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;l&#39;&amp;&lt;/a&gt;')
  })

  it('fill remplace {n} par le nombre formaté en français', () => {
    expect(fill('{n} questions ({n})', 2140)).toBe(`${fmt(2140)} questions (${fmt(2140)})`)
    expect(fmt(2140)).toMatch(/^2.140$/)
  })

  it('clip ne dépasse jamais max et coupe sur un espace', () => {
    const long = 'mot '.repeat(80).trim()
    const out = clip(long, 155)
    expect(out.length).toBeLessThanOrEqual(155)
    expect(out.endsWith('…')).toBe(true)
    expect(out.slice(0, -1).endsWith(' ')).toBe(false)
    expect(clip('court', 155)).toBe('court')
  })

  it('stripTags et wordCount ignorent balises, scripts et entités', () => {
    const html = '<p>Un <b>deux</b> trois&nbsp;<script>var x = "quatre cinq"</script></p>'
    expect(stripTags(html)).toBe('Un deux trois')
    expect(wordCount(html)).toBe(3)
    expect(wordCount('')).toBe(0)
  })

  it('autoLink rend les URL nues cliquables sans avaler la ponctuation', () => {
    const out = autoLink('Voir https://policies.google.com/technologies/partner-sites. Merci.')
    expect(out).toBe(
      'Voir <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">https://policies.google.com/technologies/partner-sites</a>. Merci.',
    )
    expect(autoLink('sans lien')).toBe('sans lien')
  })

  it('lastmodOf renvoie une date ISO, et le repli quand rien n’est connu', () => {
    const fallback = '2026-09-07T00:00:00.000Z'
    expect(lastmodOf(['fichier/qui/n/existe/pas.txt'], fallback)).toBe(fallback)
    const d = lastmodOf(['package.json'], fallback)
    expect(Number.isNaN(Date.parse(d))).toBe(false)
  })

  it('APP suit le contrat d’URL', () => {
    expect(APP.play('code-route', 'expert')).toBe('/jouer/code-route/expert')
    expect(APP.duel('manga-anime')).toBe('/defi/manga-anime/facile')
    expect(APP.errors('panneaux')).toBe('/erreurs/panneaux')
    expect(APP.exam).toBe('/examen')
    expect(APP.daily).toBe('/quotidien')
    expect(APP.signs).toBe('/revision/panneaux')
    expect(APP.flashcards).toBe('/flashcards')
  })
})

describe('contenu éditorial', () => {
  it('les 10 thèmes officiels ont un id unique et un libellé', () => {
    expect(EXAM_THEMES).toHaveLength(10)
    expect(new Set(EXAM_THEMES.map((t) => t.id)).size).toBe(10)
  })

  it('aucun tiret long dans les textes des catégories et de la FAQ examen', () => {
    const textes = [
      ...CATS.flatMap((c) => [c.label, c.short, ...c.intro]),
      ...EXAM_FAQ.flatMap((f) => [f.q, f.a]),
    ]
    for (const t of textes) expect(t).not.toContain(DASH)
  })

  it('les compteurs couvrent toutes les catégories', () => {
    const counts = readCounts()
    for (const c of CATS) expect(counts[c.bank]).toBeDefined()
    expect(totalQuestions(counts)).toBeGreaterThan(1000)
  })
})

describe('renderHomeShell', () => {
  const counts = readCounts()
  const shell = renderHomeShell(counts)

  it('porte un H1 ciblé et le nombre total de questions', () => {
    expect(shell).toContain(
      '<h1 class="home-tagline" style="font-weight:600">Quiz gratuit, sans inscription : code de la route, culture générale, manga, cinéma</h1>',
    )
    expect(shell).toContain(`${fmt(totalQuestions(counts))} questions`)
    expect(shell).not.toContain('<h1 class="logo">')
  })

  // Borne haute relevée de 250 à 320 (chantier shell-home) : les blocs inertes
  // du tableau de bord (accroche de progression, défi du jour avec ses chips,
  // bloc examen blanc du héros) réservent leur hauteur et pèsent ~55 mots.
  it('compte entre 200 et 320 mots réels', () => {
    const n = wordCount(shell)
    expect(n).toBeGreaterThanOrEqual(200)
    expect(n).toBeLessThanOrEqual(320)
  })

  it('réserve la hauteur avec les blocs inertes de l’app', () => {
    expect(shell).toContain('class="home-tabs"')
    expect(shell).toContain('class="selectors"')
    expect(shell).toContain('class="seg"')
    expect(shell).toContain('class="hero-card"')
    // Inertes : pas de bouton ni de formulaire, React n'a rien à hydrater.
    expect(shell).not.toMatch(/<button|<form|<input/)
  })

  it('pointe vers les chemins de l’app et les pages statiques', () => {
    for (const href of [
      '/jouer/code-route/facile',
      '/jouer/culture-generale/facile',
      '/jouer/manga-anime/facile',
      '/jouer/panneaux/facile',
      '/jouer/cinema-series/facile',
      '/defi/culture-generale/facile',
      '/examen',
      '/quotidien',
      '/panneaux/pieges',
      '/code-de-la-route/examen-blanc',
      '/quiz/',
      '/panneaux/',
      '/a-propos',
      '/contact',
    ]) {
      expect(shell).toContain(`href="${href}"`)
    }
    expect(shell).not.toContain('?jouer=')
  })

  it('ne contient pas de tiret long', () => {
    expect(shell).not.toContain(DASH)
  })
})
