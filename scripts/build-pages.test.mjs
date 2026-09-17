// Tests des pages statiques, sans build : les fonctions de page sont pures.
import { describe, expect, it } from 'vitest'
import { SIGNS } from '../src/content/panneaux/signs.js'
import {
  allPages,
  page404,
  pageCategory,
  pageContact,
  pageExamBlanc,
  pageLegal,
  pageQuizHub,
  pageSign,
  signTitle,
  sitemapXml,
} from './build-pages.mjs'
import { CATS, wordCount } from './site-data.mjs'

const DASH = '—'
const mainOf = (html) => html.split('<main class="page-main">')[1].split('</main>')[0]
const titleOf = (html) => html.match(/<title>(.*?)<\/title>/)[1]

describe('toutes les pages', () => {
  const pages = allPages()

  it('couvrent le contrat d’URL des pages statiques', () => {
    const urls = pages.map((p) => p.url)
    for (const u of [
      '/quiz/',
      ...CATS.map((c) => `/quiz/${c.id}`),
      '/code-de-la-route/examen-blanc',
      '/panneaux/',
      '/panneaux/pieges',
      ...SIGNS.map((s) => `/panneaux/${s.id}`),
      '/a-propos',
      '/contact',
      '/confidentialite',
      '/conditions',
      '/404.html',
    ]) {
      expect(urls).toContain(u)
    }
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('ont un titre de 60 caractères au plus et une description de 160 au plus', () => {
    for (const p of pages) {
      expect(p.title.length, p.url).toBeLessThanOrEqual(60)
      expect(p.description.length, p.url).toBeLessThanOrEqual(160)
      expect(titleOf(p.html)).toBe(p.title.replace(/&/g, '&amp;').replace(/'/g, '&#39;'))
    }
  })

  it('ne contiennent aucun tiret long', () => {
    for (const p of pages) expect(p.html, p.url).not.toContain(DASH)
  })

  it('ne pointent plus vers les anciens liens profonds', () => {
    for (const p of pages) {
      expect(p.html, p.url).not.toContain('?jouer=')
      expect(p.html, p.url).not.toContain('?onglet=')
    }
  })

  it('n’injectent AdSense que sur les pages éditoriales', () => {
    const sansPub = ['/contact', '/confidentialite', '/conditions', '/404.html']
    for (const p of pages) {
      const a = p.html.includes('adsbygoogle.js')
      expect(a, p.url).toBe(!sansPub.includes(p.url))
    }
  })

  it('ont un fil d’Ariane cohérent (un seul item sur l’accueil)', () => {
    for (const p of pages) {
      const m = p.html.match(/"@type":"BreadcrumbList".*?"itemListElement":(\[.*?\])\}/)
      if (!m) continue
      const items = JSON.parse(m[1])
      const home = items.filter((i) => i.item === 'https://ryo-offc.com/')
      expect(home, p.url).toHaveLength(1)
      expect(items.at(-1).item, p.url).toBe(`https://ryo-offc.com${p.url}`)
    }
  })
})

describe('hub et catégories', () => {
  it('le hub /quiz/ présente les 5 thèmes et cible « quiz gratuit »', () => {
    const p = pageQuizHub()
    expect(p.title).toMatch(/^Quiz gratuit sans inscription/)
    for (const c of CATS) expect(p.html).toContain(`href="/quiz/${c.id}"`)
    expect(p.html).toContain('href="/code-de-la-route/examen-blanc"')
    expect(p.html).toContain('href="/panneaux/pieges"')
  })

  it('chaque page de catégorie a les CTA jouer et défi, et le bon fil d’Ariane', () => {
    for (const c of CATS) {
      const p = pageCategory(c)
      expect(p.html).toContain(`href="/jouer/${c.id}/facile"`)
      expect(p.html).toContain(`href="/jouer/${c.id}/expert"`)
      expect(p.html).toContain(`href="/defi/${c.id}/facile"`)
      expect(p.html).toContain('<a href="/quiz/">Quiz</a>')
      expect(p.html).toContain('Niveau Facile')
      expect(p.html).toContain('Niveau Expert')
    }
  })

  it('/quiz/code-route porte la section examen 2026 et sa FAQ structurée', () => {
    const p = pageCategory(CATS.find((c) => c.id === 'code-route'))
    expect(p.html).toContain('L’examen du code en 2026')
    expect(p.html).toContain('"@type":"FAQPage"')
    expect(p.html).toContain('href="/examen"')
    expect(p.html).toContain('href="/defi/code-route/facile"')
    expect(p.html).toContain('12 septembre 2023')
    expect(p.html).toContain('1er juillet 2026')
    expect(p.html).toContain('La circulation routière')
  })
})

describe('landing examen blanc', () => {
  const p = pageExamBlanc()

  it('fait au moins 600 mots et cite les faits officiels', () => {
    expect(wordCount(mainOf(p.html))).toBeGreaterThanOrEqual(600)
    for (const fact of ['40', '35/40', '20 s', '30 €', '24 à 48 heures', '5 ans', '12 septembre 2023', '16 avril 2026']) {
      expect(p.html).toContain(fact)
    }
  })

  it('renvoie vers l’app et les pages voisines', () => {
    for (const href of ['/examen', '/jouer/code-route/facile', '/defi/code-route/facile', '/quiz/code-route', '/panneaux/', '/panneaux/pieges', '/flashcards']) {
      expect(p.html).toContain(`href="${href}"`)
    }
    expect(p.html).toContain('"@type":"FAQPage"')
    expect(p.url).toBe('/code-de-la-route/examen-blanc')
  })
})

describe('fiches panneaux', () => {
  // Panneau nu : sans les champs éditoriaux facultatifs (details.js), pour
  // tester les deux rendus quel que soit l'état de la banque.
  const { short: _s, alt: _a, detail: _d, ...b15 } = SIGNS.find((s) => s.id === 'b15')
  void _s
  void _a
  void _d

  it('signTitle préfère `short` et tient toujours en 60 caractères', () => {
    const longName = { code: 'B27a', name: 'Voie réservée aux véhicules des services réguliers de transport en commun' }
    expect(signTitle(longName).length).toBeLessThanOrEqual(60)
    expect(signTitle({ ...longName, short: 'Voie réservée aux bus' })).toBe('Panneau B27a : Voie réservée aux bus')
    expect(signTitle({ code: 'AB4', name: 'Stop' })).toBe('Panneau AB4 : Stop')
  })

  it('rend detail et alt quand ils existent, et jamais la FAQ dupliquée', () => {
    const sans = pageSign(b15)
    expect(sans.html).not.toContain('En pratique')
    expect(sans.html).not.toContain('Comment reconnaître')
    expect(sans.html).toContain(`aria-label="Panneau B15 : ${b15.name.replace(/'/g, '&#39;')}"`)

    const avec = pageSign({ ...b15, detail: 'Le panneau se place avant le rétrécissement.', alt: 'Flèche rouge et flèche noire.' })
    expect(avec.html).toContain('<h2>En pratique</h2>')
    expect(avec.html).toContain('Le panneau se place avant le rétrécissement.')
    expect(avec.html).toContain('aria-label="Flèche rouge et flèche noire."')
  })

  it('le pager reste dans la famille du panneau', () => {
    const fam = SIGNS.filter((s) => s.family === b15.family)
    const first = pageSign(fam[0]).html
    const last = pageSign(fam.at(-1)).html
    const pagerOf = (html) => html.match(/<nav class="pager"[\s\S]*?<\/nav>/)[0]
    expect(pagerOf(first)).toContain(`href="/panneaux/#${b15.family}"`)
    if (fam.length > 1) expect(pagerOf(first)).toContain(`href="/panneaux/${fam[1].id}"`)
    expect(pagerOf(last)).toContain(`href="/panneaux/#${b15.family}"`)
    for (const s of fam) {
      const html = pagerOf(pageSign(s).html)
      const links = [...html.matchAll(/href="\/panneaux\/([a-z0-9]+)"/g)].map((m) => m[1])
      for (const id of links) expect(SIGNS.find((x) => x.id === id).family).toBe(s.family)
    }
  })
})

describe('pages sans contenu éditorial', () => {
  it('les pages légales viennent de legal.js, avec liens automatiques', () => {
    const p = pageLegal('privacy')
    expect(p.html).toContain('<h2>Éditeur</h2>')
    expect(p.html).toContain('class="legal-section"')
    expect(p.html).not.toContain('adsbygoogle')
    expect(pageLegal('terms').url).toBe('/conditions')
  })

  it('/contact ne propose qu’Instagram tant que CONTACT_EMAIL est vide', () => {
    const p = pageContact()
    expect(p.html).toContain('instagram.com/ryo.offc')
    expect(p.html).not.toContain('mailto:')
  })

  it('la 404 est hors sitemap, noindex, et renvoie vers les quatre entrées', () => {
    const p = page404()
    expect(p.sitemap).toBe(false)
    expect(p.html).toContain('<meta name="robots" content="noindex" />')
    expect(p.html).toContain('<h1>Page introuvable</h1>')
    for (const href of ['/', '/panneaux/', '/quiz/', '/examen']) expect(p.html).toContain(`href="${href}"`)
  })
})

describe('sitemap', () => {
  it('écrit une entrée avec lastmod par URL', () => {
    const xml = sitemapXml([
      { url: '/', lastmod: '2026-09-07T10:00:00+02:00' },
      { url: '/quiz/', lastmod: '2026-09-01T10:00:00+02:00' },
    ])
    expect(xml).toContain('<loc>https://ryo-offc.com/</loc><lastmod>2026-09-07T10:00:00+02:00</lastmod>')
    expect(xml).toContain('<loc>https://ryo-offc.com/quiz/</loc><lastmod>2026-09-01T10:00:00+02:00</lastmod>')
    expect(xml.match(/<url>/g)).toHaveLength(2)
  })
})
