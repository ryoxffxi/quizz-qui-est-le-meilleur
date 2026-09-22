// Génère, APRÈS `vite build`, les pages HTML statiques du site dans dist/ :
//   /panneaux/                       galerie des 62 panneaux par famille
//   /panneaux/<id>                   une fiche par panneau (visuel, code, signification)
//   /panneaux/pieges                 les paires de panneaux qu'on confond
//   /quiz/                           hub des thèmes (cible « quiz gratuit »)
//   /quiz/<catégorie>                une page par thème, avec des exemples de questions
//   /code-de-la-route/examen-blanc   landing de l'examen blanc (faits 2026, méthode)
//   /a-propos  /contact  /confidentialite  /conditions
//   /404.html                        page « introuvable » servie par le Worker (statut 404)
//   /sitemap.xml                     toutes les URL ci-dessus + l'accueil, avec lastmod
//
// Ces pages donnent aux robots (Google, examen AdSense) et aux navigateurs sans
// JavaScript un vrai contenu lisible ; l'app (index.html) reste seule à faire
// jouer. Elles réutilisent la feuille de style de l'app (dist/assets/index-*.css)
// pour partager son identité visuelle, plus quelques règles propres aux pages.
//
// Adressage Cloudflare (Workers Static Assets, html_handling auto-trailing-slash) :
// un fichier `x.html` est servi sur `/x` (sans slash), un `dossier/index.html`
// sur `/dossier/` (avec slash). Les URL déclarées ici respectent cette règle.
//
// Chaque page est une fonction PURE qui renvoie { url, title, description,
// html, sources } ; seul main() touche à dist/. Les tests
// (build-pages.test.mjs) importent les fonctions sans build préalable.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { FAMILIES, SIGNS, getSign } from '../src/content/panneaux/signs.js'
import { CONFUSIONS, confusionsBySign } from '../src/content/panneaux/confusions.js'
import { LEGAL } from '../src/content/legal.js'
import {
  ADSENSE_CLIENT,
  APP,
  CATS,
  CONTACT_EMAIL,
  EXAM,
  EXAM_FAQ,
  EXAM_THEMES,
  GAME,
  INSTAGRAM,
  ROOT,
  SITE,
  SITE_NAME,
  autoLink,
  catTotal,
  clip,
  esc,
  fill,
  fmt,
  lastmodOf,
  readCounts,
  totalQuestions,
} from './site-data.mjs'

const DIST = path.join(ROOT, 'dist')

// Table symétrique des pièges, calculée une fois (elle échoue bruyamment si une
// paire cite un panneau inexistant).
const CONFUSION_TABLE = confusionsBySign(SIGNS.map((s) => s.id))

const counts = readCounts()
const TOTAL = totalQuestions(counts)
const PAN = CATS.find((c) => c.id === 'panneaux')
const ROUTE = CATS.find((c) => c.id === 'code-route')

// Feuille de style hachée de l'app ; main() la remplace par le vrai nom.
let cssHref = '/assets/index.css'

// Fichiers sources dont dépend chaque page (sitemap <lastmod>). Un fichier
// encore absent (details.js tant que le chantier panneaux n'a pas livré) est
// simplement ignoré par lastmodOf.
const SRC_SIGNS = [
  'src/content/panneaux/signs.js',
  'src/content/panneaux/details.js',
  'src/content/panneaux/shapes.js',
  'src/content/panneaux/confusions.js',
]
const SRC_SITE = ['scripts/site-data.mjs']
const SRC_PAGES = ['scripts/build-pages.mjs', 'scripts/site-data.mjs']
const bankFile = (cat) => `src/content/${cat.bank}.json`

function fail(msg) {
  console.error('build-pages :', msg)
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Gabarit commun
// ---------------------------------------------------------------------------

const PAGE_CSS = `
.page{max-width:680px;margin:0 auto;padding:18px 18px 48px}
.page-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.brand{display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--text);font-family:var(--font-display);font-weight:700;font-size:1.25rem}
.brand .q-mark{width:36px;height:36px;font-size:20px}
.page-nav{display:flex;gap:4px;flex-wrap:wrap}
.page-nav a{color:var(--text-dim);text-decoration:none;font-weight:650;font-size:.9rem;padding:7px 10px;border-radius:999px;border:1px solid transparent}
.page-nav a:hover,.page-nav a[aria-current]{color:var(--text);background:var(--surface);border-color:var(--border)}
.crumbs{font-size:.8rem;color:var(--text-dim);margin:0 0 14px}
.crumbs a{color:var(--text-dim)}
.page-main h1{font-family:var(--font-display);font-size:1.75rem;line-height:1.15;letter-spacing:-.4px;margin:0 0 10px}
.page-main h2{font-family:var(--font-display);font-size:1.2rem;margin:28px 0 8px}
.page-main h3{font-size:1rem;margin:18px 0 8px}
.page-main p,.page-main li{font-size:.95rem;line-height:1.6;color:var(--text)}
.page-main ul,.page-main ol{padding-left:20px}
.page-main .lead{font-size:1.02rem;color:var(--text-dim)}
.page-main a{color:var(--accent-soft)}
.pill{display:inline-block;padding:3px 10px;border-radius:999px;background:var(--surface-2);border:1px solid var(--border);font-size:.75rem;font-weight:700;color:var(--text-dim);letter-spacing:.4px;margin-right:4px}
.cta-row{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}
.cta-row .btn{width:auto;flex:1;min-width:150px;text-align:center;text-decoration:none;display:inline-block;padding:14px}
.sign-grid{grid-template-columns:repeat(4,1fr)}
.sign-grid a.sign-card{text-decoration:none;color:inherit}
.sign-name-sm{font-size:.74rem;color:var(--text);text-align:center;line-height:1.25}
.sign-hero{display:flex;flex-direction:column;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:22px 16px;margin:14px 0}
.sign-hero .sign-image{width:min(220px,60%)}
.qa{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px}
.qa>li{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px}
.qa .q{font-weight:700;margin:0 0 8px}
.qa .qa-img{width:84px;margin:0 0 10px}
.qa ol{margin:0 0 8px 18px;padding:0;color:var(--text-dim)}
.qa ol li{padding:2px 0;font-size:.9rem}
.qa ol li.ok{color:var(--good);font-weight:700}
.qa ol li .sign-image{display:inline-block;width:28px;vertical-align:middle;margin-right:6px}
.qa .why{margin:0;font-size:.88rem;color:var(--text-dim)}
.toc{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 4px}
.toc a{text-decoration:none;color:var(--text-dim);font-size:.85rem;font-weight:650;padding:7px 12px;border-radius:999px;background:var(--surface);border:1px solid var(--border)}
.toc a:hover{color:var(--text)}
.confusion-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:12px}
.confusion{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px}
.confusion-pair{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:10px}
.confusion-pair .sign-image{width:76px}
.confusion-pair a.sign-card{text-decoration:none;color:inherit;padding:0;background:none;border:0}
.confusion-vs{font-family:var(--font-display);font-size:1.4rem;color:var(--text-dim)}
.confusion p{margin:0}
.faq{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px}
.faq>li{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 16px}
.faq .q{font-weight:700;margin:0 0 6px}
.faq p:last-child{margin:0;color:var(--text-dim);font-size:.9rem}
.cat-links{display:flex;flex-direction:column;gap:10px;margin-top:8px}
a.cat-card{text-decoration:none}
.facts{list-style:none;padding:0;margin:14px 0;display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.facts li{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 14px;font-size:.9rem;line-height:1.4}
.facts b{display:block;font-family:var(--font-display);font-size:1.3rem;color:var(--text);margin-bottom:2px}
.themes li{padding:3px 0}
.pager{display:flex;justify-content:space-between;gap:10px;margin-top:26px;font-size:.9rem}
.pager a{text-decoration:none;color:var(--text-dim);padding:8px 12px;border-radius:999px;background:var(--surface);border:1px solid var(--border)}
.pager a:hover{color:var(--text)}
.related .sign-name-sm{display:none}
.notfound{text-align:center;padding:40px 0 20px}
.notfound .q-mark{width:64px;height:64px;font-size:36px;margin:0 auto 18px}
@media (max-width:520px){.sign-grid{grid-template-columns:repeat(3,1fr)}.page-main h1{font-size:1.5rem}.facts{grid-template-columns:1fr 1fr}}
`

const INSTA_SVG = `<svg class="insta-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><defs><linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#feda75"/><stop offset="0.35" stop-color="#fa7e1e"/><stop offset="0.62" stop-color="#d62976"/><stop offset="1" stop-color="#962fbf"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5.5" fill="none" stroke="url(#ig-grad)" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="url(#ig-grad)" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.35" fill="url(#ig-grad)"/></svg>`

const EXAM_URL = '/code-de-la-route/examen-blanc'

const NAV = [
  ['/', 'Jouer'],
  ['/quiz/', 'Quiz'],
  ['/panneaux/', 'Panneaux'],
  [EXAM_URL, 'Examen blanc'],
]

function header(current) {
  const links = NAV.map(
    ([href, label]) =>
      `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`,
  ).join('')
  return `<header class="page-top"><a class="brand" href="/"><span class="q-mark" aria-hidden="true">Q</span>${SITE_NAME}</a><nav class="page-nav" aria-label="Navigation">${links}</nav></header>`
}

function footer() {
  const links = [
    ['/', 'Accueil'],
    ['/quiz/', 'Quiz'],
    ['/panneaux/', 'Panneaux'],
    [EXAM_URL, 'Examen blanc'],
    ['/a-propos', 'À propos'],
    ['/contact', 'Contact'],
    ['/confidentialite', 'Confidentialité'],
    ['/conditions', 'Conditions'],
  ]
    .map(([href, label]) => `<a href="${href}">${esc(label)}</a>`)
    .join('<span aria-hidden="true">·</span>')
  return `<footer class="site-footer">
<a class="insta-link" href="${INSTAGRAM}" target="_blank" rel="noopener noreferrer" aria-label="Instagram @ryo.offc">${INSTA_SVG}<span>@ryo.offc</span></a>
<p class="footer-note">Quizz est un jeu gratuit, sans compte : ${fmt(TOTAL)} questions, 4 langues.</p>
<nav class="footer-links">${links}</nav>
</footer>`
}

function breadcrumbs(items) {
  const all = [['Accueil', '/'], ...items]
  const html = all
    .map(([label, href], i) =>
      i < all.length - 1 ? `<a href="${href}">${esc(label)}</a> › ` : `<span>${esc(label)}</span>`,
    )
    .join('')
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map(([label, href], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: label,
      item: SITE + href,
    })),
  }
  return { html: `<nav class="crumbs" aria-label="Fil d’Ariane">${html}</nav>`, ld }
}

function faqLd(faq) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

function faqHtml(faq) {
  return `<ul class="faq">${faq.map((f) => `<li><p class="q">${esc(f.q)}</p><p>${esc(f.a)}</p></li>`).join('')}</ul>`
}

// `jsonld` : blocs schema.org supplémentaires (FAQPage). Ils s'ajoutent au fil
// d'Ariane, généré automatiquement.
// `ads` : false sur les pages sans contenu éditorial (contact, légal, 404) :
// AdSense y est inutile et fragilise l'examen du site.
function layout({
  title,
  description,
  url,
  body,
  crumbs = [],
  current = '',
  jsonld = [],
  ads = true,
  noindex = false,
}) {
  const canonical = SITE + url
  const bc = crumbs.length ? breadcrumbs(crumbs) : null
  const blocs = [...(bc ? [bc.ld] : []), ...jsonld]
    .map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`)
    .join('\n')
  const adsTag = ads
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>`
    : ''
  return `<!doctype html>
<html lang="fr" data-theme="volt">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
${noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${canonical}" />`}
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<meta name="theme-color" content="#0a0d16" />
<script>try{var t=localStorage.getItem('quizz_theme');document.documentElement.dataset.theme=t==='crimson'?'crimson':'volt'}catch(e){}</script>
<link rel="preload" href="/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="${cssHref}" />
<style>${PAGE_CSS}</style>
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${esc(SITE_NAME)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
${adsTag}
${blocs}
</head>
<body>
<div class="page">
${header(current)}
${bc ? bc.html : ''}
<main class="page-main">
${body}
</main>
${footer()}
</div>
</body>
</html>
`
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

const fr = (field) => (field && typeof field === 'object' ? (field.fr ?? field.en ?? '') : (field ?? ''))

// Même générateur déterministe que l'app (src/lib/quiz.js) : les exemples
// affichés ne changent pas d'un build à l'autre tant que la banque ne bouge pas.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function seedOf(str) {
  let h = 2166136261
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}
function sample(items, seed, n) {
  const rng = mulberry32(seed)
  const arr = items.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, n)
}

// « A, B et C » : la virgule sèche fait bâclé dans une phrase de réponse.
function listeFr(items) {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`
}

const bankCache = new Map()
function readBank(cat) {
  if (!bankCache.has(cat.id)) {
    bankCache.set(cat.id, JSON.parse(readFileSync(path.join(ROOT, bankFile(cat)), 'utf8')))
  }
  return bankCache.get(cat.id)
}

function signImage(id, cls = 'sign-image') {
  const s = getSign(id)
  return s ? `<span class="${cls}" aria-hidden="true">${s.svg}</span>` : ''
}

function signCard(s, { withName = true } = {}) {
  return `<a class="sign-card" href="/panneaux/${s.id}"><span class="sign-image" aria-hidden="true">${s.svg}</span><span class="sign-code">${esc(s.code)}</span>${withName ? `<span class="sign-name-sm">${esc(s.name)}</span>` : ''}</a>`
}

function catCard(c) {
  return `<a class="cat-card" href="/quiz/${c.id}"><span class="cat-ic" style="--cat:${c.color}">${c.emoji}</span><span class="cat-tx"><span class="cat-label">${esc(c.label)}</span><span class="cat-count">${fmt(catTotal(counts, c))} questions</span></span><span class="cat-go" aria-hidden="true">›</span></a>`
}

// Boutons vers l'app (contrat d'URL) : jouer Facile / Expert, défier un pote,
// et l'examen blanc sur les pages code de la route.
function playButtons(catId, { exam = false } = {}) {
  const btns = [
    `<a class="btn btn-primary" href="${APP.play(catId, 'facile')}">Jouer · Facile</a>`,
    `<a class="btn btn-secondary" href="${APP.play(catId, 'expert')}">Jouer · Expert</a>`,
    `<a class="btn btn-secondary" href="${APP.duel(catId, 'facile')}">Défier un pote</a>`,
  ]
  if (exam) btns.push(`<a class="btn btn-primary" href="${APP.exam}">Passer un examen blanc</a>`)
  return `<div class="cta-row">${btns.join('')}</div>`
}

// Titre d'une fiche panneau : « Panneau B15 : Cédez le passage à la circulation
// venant en sens inverse » dépasse 60 caractères ; le chantier panneaux fournit
// `short` pour ces cas. Tant qu'il manque, on raccourcit sans casser un mot.
export function signTitle(s) {
  const name = s.short ?? s.name
  let t = `Panneau ${s.code} : ${name}`
  if (t.length > 60) t = `${s.code} : ${name}`
  if (t.length > 60) t = clip(t, 60)
  return t
}

// Compte les questions de code par thème officiel quand le champ `theme` existe
// (chantier contenu). Vide tant qu'il n'existe pas : la liste s'affiche sans
// compteurs.
function themeCounts(bank) {
  const m = new Map()
  for (const q of bank) {
    if (!q.theme) continue
    const key = String(q.theme).toLowerCase()
    m.set(key, (m.get(key) || 0) + 1)
  }
  return m
}

function themesList(bank) {
  const m = themeCounts(bank)
  const items = EXAM_THEMES.map((t) => {
    const n = m.get(t.id) ?? m.get(t.label.toLowerCase()) ?? 0
    return `<li>${esc(t.label)}${n ? ` <span class="pill">${n} questions</span>` : ''}</li>`
  })
  return `<ol class="themes">${items.join('')}</ol>`
}

function examFacts() {
  const facts = [
    [`${EXAM.questions}`, 'questions à choix multiples, une seule bonne réponse'],
    [`${EXAM.pass}/${EXAM.questions}`, 'bonnes réponses pour être reçu (5 erreurs au maximum)'],
    [`${EXAM.seconds} s`, 'par question environ, après la vidéo ou la photo'],
    [`${EXAM.price} €`, 'par présentation dans un centre agréé'],
    [`${EXAM.resultDelay}`, 'pour recevoir le résultat par e-mail'],
    [`${EXAM.validityYears} ans`, 'de validité du code, pour 5 passages de la pratique'],
    ['10 thèmes', 'officiels, tirés dans une banque réécrite le ' + EXAM.bankRewritten],
    ['La veille', `clôture des inscriptions depuis le ${EXAM.closeRegistration} (${EXAM.decree})`],
  ]
  return `<ul class="facts">${facts.map(([b, t]) => `<li><b>${esc(b)}</b>${esc(t)}</li>`).join('')}</ul>`
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

function page({ url, title, description, sources, sitemap = true, ...rest }) {
  return {
    url,
    title,
    description,
    sources,
    sitemap,
    html: layout({ url, title, description, ...rest }),
  }
}

export function pagePanneauxIndex() {
  const families = FAMILIES.map((f) => {
    const signs = SIGNS.filter((s) => s.family === f.id)
    return `<section id="${f.id}">
<h2>${f.emoji} ${esc(f.label)} <span class="pill">${signs.length} panneaux</span></h2>
<p>${esc(f.desc)}</p>
<div class="sign-grid">${signs.map((s) => signCard(s)).join('')}</div>
</section>`
  }).join('')

  const body = `<h1>Les ${SIGNS.length} panneaux du code de la route à connaître</h1>
<p class="lead">Une fiche par panneau, avec son visuel, son code officiel et sa signification. Révise famille par famille, puis vérifie tes acquis avec le quiz spécial panneaux (${fmt(catTotal(counts, PAN))} questions illustrées).</p>
<p>Les panneaux routiers français se reconnaissent d’abord à leur forme et à leur couleur : le triangle à bord rouge annonce un danger, le rond cerclé de rouge interdit, le rond bleu oblige, le carré bleu informe, et le panneau barré marque la fin d’une prescription. Deux panneaux de priorité ont une forme unique, reconnaissable même de dos ou sous la neige : le stop (octogone) et le cédez-le-passage (triangle pointe en bas).</p>
<p><strong>Le plus dur n’est pas d’apprendre les panneaux, c’est de ne pas les intervertir.</strong> Les <a href="/panneaux/pieges">${CONFUSIONS.length} paires les plus confondues</a> sont réunies sur une page, côte à côte.</p>
<div class="cta-row"><a class="btn btn-primary" href="${APP.signs}">Réviser dans l’app</a><a class="btn btn-secondary" href="${APP.flashcards}">Flashcards</a></div>
${playButtons('panneaux')}
${families}
<h2>Aller plus loin</h2>
<p>Les panneaux ne sont qu’un chapitre : le <a href="/quiz/code-route">quiz Code de la route</a> couvre aussi les priorités, les vitesses, les sanctions et la sécurité du véhicule, avec ${fmt(catTotal(counts, ROUTE))} questions expliquées. Quand tu te sens prêt, passe un <a href="${EXAM_URL}">examen blanc de ${EXAM.questions} questions</a>.</p>`

  return page({
    url: '/panneaux/',
    title: `Les ${SIGNS.length} panneaux du code de la route : fiches et quiz`,
    description: clip(
      `Les ${SIGNS.length} panneaux routiers essentiels par famille (danger, priorité, interdiction, obligation, indication) : visuel, code officiel, signification et quiz illustré gratuit.`,
    ),
    current: '/panneaux/',
    crumbs: [['Panneaux', '/panneaux/']],
    sources: SRC_SIGNS,
    body,
  })
}

// Bloc « à ne pas confondre » : le panneau jumeau en vis-à-vis, avec la règle
// qui les sépare. C'est le seul endroit du site où l'on voit deux panneaux côte
// à côte, or c'est exactement comme ça qu'on les apprend.
function confusionBloc(s) {
  const paires = CONFUSION_TABLE[s.id]
  if (!paires) return { html: '', faq: [] }
  const cartes = paires
    .map(({ id, tip }) => {
      const autre = getSign(id)
      return `<li class="confusion">
<div class="confusion-pair">
<span class="sign-image" role="img" aria-label="Panneau ${esc(s.code)}">${s.svg}</span>
<span class="confusion-vs" aria-hidden="true">≠</span>
<a class="sign-card" href="/panneaux/${autre.id}"><span class="sign-image" aria-hidden="true">${autre.svg}</span><span class="sign-code">${esc(autre.code)}</span></a>
</div>
<p><b>${esc(s.code)} ou ${esc(autre.code)} ?</b> ${esc(tip)}</p>
</li>`
    })
    .join('')
  const codes = paires.map((p) => getSign(p.id).code)
  const html = `<h2 id="confusions">À ne pas confondre</h2>
<p>${codes.length === 1 ? `Un panneau est régulièrement confondu avec ${s.code}` : `${codes.length} panneaux sont régulièrement confondus avec ${s.code}`} : ${listeFr(codes)}. Voici ce qui les sépare.</p>
<ul class="confusion-list">${cartes}</ul>
<p>Toutes les paires piégeuses sont réunies sur la page <a href="/panneaux/pieges">panneaux qui se ressemblent</a>.</p>`
  // Une question PAR paire, pas une question fourre-tout : c'est la formulation
  // réellement tapée (« différence entre B15 et C18 ») et chaque paire devient
  // une entrée distincte dans les résultats enrichis.
  const faq = paires.map((p) => ({
    q: `Quelle est la différence entre les panneaux ${s.code} et ${getSign(p.id).code} ?`,
    a: p.tip,
  }))
  return { html, faq }
}

// Fiche d'un panneau. Champs facultatifs fournis par le chantier panneaux :
// `short` (titre court), `alt` (description du visuel), `detail` (paragraphe
// « En pratique »). SIGNS est trié par famille : le pager suit cet ordre.
export function pageSign(s) {
  const fam = FAMILIES.find((f) => f.id === s.family)
  const famSigns = SIGNS.filter((x) => x.family === s.family)
  const idx = famSigns.findIndex((x) => x.id === s.id)
  const siblings = famSigns.filter((x) => x.id !== s.id)
  const prev = famSigns[idx - 1]
  const next = famSigns[idx + 1]
  const title = signTitle(s)
  const conf = confusionBloc(s)
  const alt = s.alt ?? `Panneau ${s.code} : ${s.name}`

  // Les questions reprennent mot pour mot ce qui est écrit plus haut : la FAQ
  // enrichie de Google exige que la réponse soit visible sur la page.
  const faq = [{ q: `Que signifie le panneau ${s.code} ?`, a: s.meaning }, ...conf.faq]

  const pager = [
    prev
      ? `<a href="/panneaux/${prev.id}">← ${esc(prev.code)}</a>`
      : `<a href="/panneaux/#${fam.id}">← ${esc(fam.label)}</a>`,
    `<a href="/panneaux/">Tous les panneaux</a>`,
    next
      ? `<a href="/panneaux/${next.id}">${esc(next.code)} →</a>`
      : `<a href="/panneaux/#${fam.id}">${esc(fam.label)} →</a>`,
  ].join('')

  const body = `<h1>${esc(s.name)}</h1>
<p><span class="pill">${esc(s.code)}</span><span class="pill">${fam.emoji} ${esc(fam.label)}</span></p>
<div class="sign-hero"><span class="sign-image" role="img" aria-label="${esc(alt)}">${s.svg}</span>${s.alt ? `<p class="why">${esc(s.alt)}</p>` : ''}</div>
<h2>Signification</h2>
<p>${esc(s.meaning)}</p>
${s.detail ? `<h2>En pratique</h2>\n<p>${esc(s.detail)}</p>` : ''}
<h2>La famille « ${esc(fam.label)} »</h2>
<p>${esc(fam.desc)} Cette famille compte ${famSigns.length} panneaux dans notre révision.</p>
${conf.html}
<h2>Dans le quiz</h2>
<p>Ce panneau fait partie du quiz Panneaux (${fmt(catTotal(counts, PAN))} questions illustrées). En Facile, il faut le reconnaître parmi des panneaux d’autres familles ; en Expert, le distinguer de panneaux proches de la même famille. En solo, chaque réponse est corrigée tout de suite ; en défi, un lien permet à un ami de jouer les mêmes questions. L’<a href="${EXAM_URL}">examen blanc</a> en tire ${GAME.examSignQuestions} au hasard parmi ses ${EXAM.questions} questions.</p>
${playButtons('panneaux')}
<h2>Questions fréquentes</h2>
${faqHtml(faq)}
<h2>Autres panneaux de la famille ${esc(fam.label)}</h2>
<div class="sign-grid related">${siblings.map((x) => signCard(x, { withName: false })).join('')}</div>
<nav class="pager" aria-label="Panneau précédent / suivant">${pager}</nav>`

  return page({
    url: `/panneaux/${s.id}`,
    title,
    description: clip(`${s.name} (${s.code}), panneau de la famille ${fam.label.toLowerCase()} : ${s.meaning}`),
    current: '/panneaux/',
    crumbs: [
      ['Panneaux', '/panneaux/'],
      [s.code, `/panneaux/${s.id}`],
    ],
    jsonld: [faqLd(faq)],
    sources: SRC_SIGNS,
    body,
  })
}

function qaItem(q) {
  const opts = fr(q.options)
  const img = q.image ? signImage(q.image, 'sign-image qa-img') : ''
  const options = opts
    .map((o, i) => {
      const pic = q.optionImages?.[i] ? signImage(q.optionImages[i]) : ''
      return `<li${i === q.correct ? ' class="ok"' : ''}>${pic}${esc(o)}${i === q.correct ? ' ✓' : ''}</li>`
    })
    .join('')
  return `<li>${img}<p class="q">${esc(fr(q.question))}</p><ol type="A">${options}</ol><p class="why">${esc(fr(q.explanation))}</p></li>`
}

function howItWorks({ exam = false } = {}) {
  return `<h2>Comment ça marche</h2>
<ul>
<li><strong>Solo</strong> : lots de ${GAME.soloBatch} questions, correction immédiate avec explication, sans chrono. Les questions déjà vues ne reviennent pas avant d’avoir fait le tour de la banque.</li>
<li><strong>Défi entre potes</strong> : manches de ${GAME.duelRound} questions chronométrées (${GAME.duelSecondsFacile} s en Facile, ${GAME.duelSecondsExpert} s en Expert), score à la vitesse. À la fin, un lien à partager : ton ami joue exactement les mêmes questions et vous comparez vos scores.</li>
${exam ? `<li><strong>Examen blanc</strong> : ${GAME.examQuestions} questions en conditions réelles, ${GAME.examSeconds} secondes chacune, reçu à partir de ${GAME.examPass} bonnes réponses.</li>` : ''}
<li><strong>Défi du jour</strong> : ${GAME.dailyQuestions} questions identiques pour tout le monde, une fois par jour.</li>
<li><strong>Mes erreurs</strong> : les questions ratées sont gardées de côté et rejouées jusqu’à deux bonnes réponses d’affilée.</li>
</ul>`
}

// Hub des thèmes : la page qui répond à « quiz gratuit » sans viser un thème.
export function pageQuizHub() {
  const sections = CATS.map((c) => {
    const n = catTotal(counts, c)
    return `<section id="${c.id}">
<h2>${c.emoji} ${esc(c.label)} <span class="pill">${fmt(n)} questions</span></h2>
<p>${esc(fill(c.short, n))}</p>
<p>${esc(fill(c.intro[0], n))} <a href="/quiz/${c.id}">Voir des exemples de questions</a>.</p>
</section>`
  }).join('')

  const body = `<h1>Quiz gratuit, sans inscription : ${CATS.length} thèmes, ${fmt(TOTAL)} questions</h1>
<p class="lead">Des quiz gratuits, sans compte ni téléchargement, à jouer seul ou entre potes depuis un téléphone. Chaque thème existe en deux niveaux, Facile et Expert, et chaque question est expliquée en une phrase.</p>
<div class="cat-links">${CATS.map(catCard).join('')}</div>
${howItWorks({ exam: true })}
${sections}
<h2>Réviser le code de la route</h2>
<p>Le code de la route est le thème le plus complet : ${fmt(catTotal(counts, ROUTE))} questions de cours, ${fmt(catTotal(counts, PAN))} questions de panneaux illustrées, les <a href="/panneaux/pieges">paires de panneaux qui se ressemblent</a> et un <a href="${EXAM_URL}">examen blanc de ${EXAM.questions} questions</a> au format de l’épreuve officielle.</p>`

  return page({
    url: '/quiz/',
    title: `Quiz gratuit sans inscription : ${CATS.length} thèmes, ${fmt(TOTAL)} questions`,
    description: clip(
      `${fmt(TOTAL)} questions gratuites, sans compte : code de la route avec examen blanc, panneaux, culture générale, manga, cinéma. Solo, défi entre potes ou défi du jour, en 4 langues.`,
    ),
    current: '/quiz/',
    crumbs: [['Quiz', '/quiz/']],
    sources: [...SRC_SITE, ...CATS.map(bankFile)],
    body,
  })
}

export function pageCategory(cat) {
  const c = counts[cat.bank] || { facile: 0, expert: 0 }
  const total = c.facile + c.expert
  const bank = readBank(cat)
  const easy = sample(bank.filter((q) => q.difficulty === 'facile'), seedOf(cat.id + ':facile'), 8)
  const hard = sample(bank.filter((q) => q.difficulty === 'expert'), seedOf(cat.id + ':expert'), 8)
  const frOnly = cat.id === 'code-route' || cat.id === 'panneaux'
  const isRoute = cat.id === 'code-route'
  const others = CATS.filter((x) => x.id !== cat.id)

  const examSection = isRoute
    ? `<h2>L’examen du code en 2026</h2>
<p>L’épreuve théorique générale (ETG) se passe sur tablette, dans un centre agréé. Voici les chiffres à connaître avant de vous inscrire.</p>
${examFacts()}
<p>Les ${EXAM.questions} questions sont réparties entre 10 thèmes officiels. Nos questions suivent le même programme :</p>
${themesList(bank)}
<div class="cta-row"><a class="btn btn-primary" href="${APP.exam}">Passer un examen blanc</a><a class="btn btn-secondary" href="${APP.duel('code-route', 'facile')}">Défier un pote</a></div>
<p>Tout sur le format, la méthode de préparation et le jour J : <a href="${EXAM_URL}">l’examen blanc du code de la route</a>.</p>
<h2>Questions fréquentes</h2>
${faqHtml(EXAM_FAQ)}`
    : ''

  const body = `<h1>Quiz ${esc(cat.label)} : ${fmt(total)} questions gratuites</h1>
<p class="lead">${esc(fill(cat.short, total))}</p>
<p><span class="pill">${c.facile} Facile</span><span class="pill">${c.expert} Expert</span><span class="pill">${frOnly ? 'Français' : 'FR · EN · ES · PT'}</span></p>
${cat.intro.map((p) => `<p>${esc(fill(p, total))}</p>`).join('\n')}
${playButtons(cat.id, { exam: isRoute })}
${howItWorks({ exam: isRoute })}
${examSection}
<h2>Exemples de questions</h2>
<p>Un aperçu de la banque, avec la bonne réponse et son explication. Dans le jeu, l’ordre des réponses change à chaque partie.</p>
<h3>Niveau Facile</h3>
<ul class="qa">${easy.map(qaItem).join('')}</ul>
<h3>Niveau Expert</h3>
<ul class="qa">${hard.map(qaItem).join('')}</ul>
${cat.id === 'panneaux' ? `<p>Pour réviser avant de jouer : <a href="/panneaux/">les fiches des ${SIGNS.length} panneaux</a> et <a href="/panneaux/pieges">les paires qui se ressemblent</a>.</p>` : ''}
<h2>Les autres thèmes</h2>
<div class="cat-links">${others.map(catCard).join('')}</div>`

  return page({
    url: `/quiz/${cat.id}`,
    title: `Quiz ${cat.label} gratuit : ${fmt(total)} questions`,
    description: clip(fill(cat.short, total)),
    current: '/quiz/',
    crumbs: [
      ['Quiz', '/quiz/'],
      [cat.label, `/quiz/${cat.id}`],
    ],
    jsonld: isRoute ? [faqLd(EXAM_FAQ)] : [],
    sources: [...SRC_SITE, bankFile(cat)],
    body,
  })
}

// Landing de l'examen blanc : la page qui répond à « examen blanc code de la
// route », avec les faits 2026 et la méthode. Vouvoiement : ton du code.
export function pageExamBlanc() {
  const nRoute = catTotal(counts, ROUTE)
  const nPan = catTotal(counts, PAN)
  const body = `<h1>Examen blanc du code de la route : ${EXAM.questions} questions, comme le jour J</h1>
<p class="lead">Un examen blanc gratuit, sans inscription, au format de l’épreuve théorique générale : ${EXAM.questions} questions, ${EXAM.seconds} secondes par question, reçu à partir de ${EXAM.pass} bonnes réponses. Le résultat est immédiat, avec la correction de chaque erreur.</p>
<div class="cta-row"><a class="btn btn-primary" href="${APP.exam}">Passer un examen blanc</a><a class="btn btn-secondary" href="${APP.play('code-route', 'facile')}">Réviser d’abord</a></div>

<h2>Ce que contient l’examen blanc de Quizz</h2>
<p>L’examen blanc tire ${EXAM.questions} questions dans une banque de ${fmt(nRoute)} questions de cours et de ${fmt(nPan)} questions de panneaux illustrées, dont ${GAME.examSignQuestions} questions de panneaux par examen, comme à l’épreuve où la signalisation revient à chaque session. Chaque question propose quatre réponses et une seule est juste. Le chronomètre de ${EXAM.seconds} secondes est le même qu’en centre d’examen : passé ce délai, la question est comptée fausse et la suivante s’affiche. Il n’y a pas de correction pendant l’examen, pour respecter les conditions réelles.</p>
<p>À la fin, vous obtenez votre score sur ${EXAM.questions}, le verdict (reçu à partir de ${EXAM.pass}) et le récapitulatif de vos erreurs avec l’explication de chacune. Les questions ratées sont gardées de côté dans « Mes erreurs » et vous pouvez les rejouer jusqu’à les maîtriser. Aucun compte n’est nécessaire : vos résultats restent dans votre navigateur, et vous pouvez repasser un examen blanc autant de fois que vous voulez, avec un tirage différent à chaque fois.</p>

<h2>L’épreuve officielle en 2026</h2>
<p>L’épreuve théorique générale, le « code », se passe sur tablette dans un centre agréé par l’État : La Poste, SGS, Dekra, Bureau Veritas ou Pearson Vue. Les chiffres à connaître :</p>
${examFacts()}
<p>Depuis le ${EXAM.bankRewritten}, les questions officielles ont été réécrites : les énoncés sont plus courts, les vidéos plus nombreuses, et les questions cherchent moins le piège de formulation que la compréhension d’une situation de conduite. Nos questions suivent cette logique : une situation, une règle, une explication.</p>
<p>Autre changement récent : en application de l’${EXAM.decree}, les inscriptions ferment la veille de la session depuis le ${EXAM.closeRegistration}. Il n’est plus possible de se présenter le jour même en espérant une place : réservez votre créneau à l’avance sur le site du centre, avec votre numéro NEPH (délivré par la préfecture, via votre auto-école ou votre inscription en candidat libre).</p>

<h2>Les 10 thèmes officiels</h2>
<p>Les ${EXAM.questions} questions d’une session couvrent l’ensemble du programme. Le nombre de questions par thème varie d’une session à l’autre, mais aucun thème n’est jamais absent :</p>
${themesList(readBank(ROUTE))}
<p>La signalisation traverse plusieurs thèmes (la route, la circulation, les autres usagers). C’est pour cela que les panneaux méritent une révision à part : les <a href="/panneaux/">${SIGNS.length} panneaux essentiels</a> ont chacun leur fiche, et les <a href="/panneaux/pieges">${CONFUSIONS.length} paires qui se ressemblent</a> sont mises côte à côte.</p>

<h2>Comment se préparer avec Quizz</h2>
<ol>
<li><strong>Révisez par lots de ${GAME.soloBatch} questions</strong> en <a href="${APP.play('code-route', 'facile')}">solo</a>, niveau Facile puis Expert. Chaque réponse est corrigée tout de suite avec une explication : vous comprenez la règle au moment où vous vous trompez, pas une heure plus tard. Les questions déjà vues ne reviennent pas avant la fin de la banque.</li>
<li><strong>Apprenez les panneaux famille par famille.</strong> La forme et la couleur donnent la nature du message avant même le dessin : triangle rouge pour le danger, rond rouge pour l’interdiction, rond bleu pour l’obligation, carré bleu pour l’indication. Le <a href="/quiz/panneaux">quiz Panneaux</a> et les <a href="${APP.flashcards}">flashcards</a> servent à ancrer ce réflexe.</li>
<li><strong>Rejouez vos erreurs.</strong> Une erreur n’est retirée de la liste qu’après deux bonnes réponses d’affilée : c’est la garantie que la règle est comprise et pas seulement mémorisée pour une fois.</li>
<li><strong>Jouez le défi du jour.</strong> ${GAME.dailyQuestions} questions identiques pour tout le monde, une fois par jour : une habitude courte qui maintient le niveau entre deux sessions de révision.</li>
<li><strong>Enchaînez les examens blancs.</strong> Quand vous obtenez au moins 37 sur ${EXAM.questions} sur trois examens blancs consécutifs, vous avez la marge nécessaire pour absorber le stress du jour J. En dessous de ${EXAM.pass}, retournez aux thèmes de vos erreurs avant de réserver votre session.</li>
</ol>

<h2>Le jour de l’examen</h2>
<p>Présentez-vous avec une pièce d’identité en cours de validité et votre convocation, une quinzaine de minutes avant l’heure. Une tablette et un casque vous sont remis ; les questions défilent avec leur vidéo ou leur photo, puis le temps de réponse démarre. L’épreuve dure une trentaine de minutes. Le résultat arrive par e-mail sous ${EXAM.resultDelay} : un code réussi reste valable ${EXAM.validityYears} ans et donne droit à cinq présentations à l’épreuve pratique. En cas d’échec, vous pouvez vous réinscrire dès le lendemain, sans délai d’attente imposé.</p>
<p>Ce site est un complément d’entraînement, gratuit et sans inscription. Il ne remplace ni la formation en auto-école ni le Code de la route officiel : en cas de doute, la règle officielle prime.</p>

<h2>Questions fréquentes</h2>
${faqHtml(EXAM_FAQ)}

<h2>Aller plus loin</h2>
<div class="cta-row"><a class="btn btn-primary" href="${APP.exam}">Passer un examen blanc</a><a class="btn btn-secondary" href="${APP.duel('code-route', 'facile')}">Défier un pote</a></div>
<p>Le <a href="/quiz/code-route">quiz Code de la route</a> présente des exemples de questions des deux niveaux. Les <a href="/panneaux/">fiches des panneaux</a> et les <a href="/panneaux/pieges">paires qui se ressemblent</a> couvrent la signalisation.</p>`

  return page({
    url: EXAM_URL,
    title: `Examen blanc du code de la route gratuit : ${EXAM.questions} questions`,
    description: clip(
      `Examen blanc gratuit au format de l’épreuve 2026 : ${EXAM.questions} questions, ${EXAM.seconds} s par question, reçu à partir de ${EXAM.pass}. Les chiffres officiels, les 10 thèmes et la méthode pour se préparer.`,
    ),
    current: EXAM_URL,
    crumbs: [
      ['Code de la route', '/quiz/code-route'],
      ['Examen blanc', EXAM_URL],
    ],
    jsonld: [faqLd(EXAM_FAQ)],
    sources: [...SRC_SITE, bankFile(ROUTE)],
    body,
  })
}

export function pageAbout() {
  const body = `<h1>À propos de Quizz</h1>
<p class="lead">Quizz (ryo-offc.com) est un jeu de quiz gratuit, sans compte et sans inscription, créé par Ryo, joueur et passionné de culture pop. L’idée de départ : réviser ou se défier entre amis en quelques secondes, depuis un téléphone, sans rien télécharger.</p>
<h2>Ce que tu trouves ici</h2>
<ul>
<li><strong>${fmt(TOTAL)} questions</strong> réparties en cinq thèmes : ${CATS.map((c) => `<a href="/quiz/${c.id}">${esc(c.label.toLowerCase())}</a>`).join(', ')}.</li>
<li><strong>Deux niveaux</strong> (Facile et Expert) et <strong>plusieurs façons de jouer</strong> : le solo, avec correction immédiate et explication ; le défi chronométré, où un lien permet à un ami de jouer exactement les mêmes questions ; l’<a href="${EXAM_URL}">examen blanc</a> du code de la route ; le défi du jour ; et la reprise de tes erreurs.</li>
<li>Un espace de <a href="/panneaux/">révision des ${SIGNS.length} panneaux</a> du code de la route, avec une fiche et un visuel pour chacun, et des flashcards.</li>
<li><strong>Quatre langues</strong> : français, anglais, espagnol et portugais. Le code de la route et les panneaux restent en français, parce qu’ils sont propres à la France.</li>
</ul>
<h2>Comment les questions sont écrites</h2>
<p>Chaque question est rédigée avec ses quatre réponses et une explication courte. Les lots sont relus, vérifiés et dédoublonnés avant publication, et les erreurs signalées sont corrigées. Le contenu reste un jeu : pour le code de la route, il complète une préparation en auto-école mais ne remplace ni le Code officiel ni un enseignement.</p>
<h2>Le modèle</h2>
<p>Tout le contenu est gratuit et aucun compte n’est nécessaire. Le site se finance par une publicité discrète, uniquement sur l’écran de résultat, jamais pendant une partie. Une offre Premium sans publicité (mensuelle ou à vie) est prévue pour celles et ceux qui veulent soutenir le projet.</p>
<h2>Les grandes étapes</h2>
<ul>
<li><strong>Juin 2026</strong> : lancement avec quatre thèmes, un millier de questions et les versions en quatre langues.</li>
<li><strong>Juillet 2026</strong> : révision des panneaux routiers et quiz dédié, avec un visuel par panneau.</li>
<li><strong>Août 2026</strong> : nouveau design, deux ambiances au choix (Volt et Crimson) et objectif atteint de 500 questions par thème.</li>
<li><strong>Septembre 2026</strong> : examen blanc du code, défi du jour, reprise des erreurs, flashcards, et l’app s’installe sur l’écran d’accueil du téléphone.</li>
</ul>
<h2>Une question, une erreur à signaler ?</h2>
<p>Voir la page <a href="/contact">Contact</a>. Chaque signalement est lu.</p>`

  return page({
    url: '/a-propos',
    title: 'À propos de Quizz : le jeu, son contenu, son modèle',
    description: clip(
      `Qui est derrière Quizz, comment les ${fmt(TOTAL)} questions sont écrites et vérifiées, comment le site est financé, et les grandes étapes du projet.`,
    ),
    current: '/a-propos',
    crumbs: [['À propos', '/a-propos']],
    sources: SRC_PAGES,
    body,
  })
}

export function pageContact() {
  const body = `<h1>Contact</h1>
<p class="lead">Une erreur dans une question, une idée de thème, un bug, une question sur la publicité ou les données ? Voici comment me joindre.</p>
<ul>
${CONTACT_EMAIL ? `<li><strong>Email</strong> : <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> (réponse sous quelques jours)</li>` : ''}
<li><strong>Instagram</strong> : <a href="${INSTAGRAM}" target="_blank" rel="noopener noreferrer">@ryo.offc</a>, en message privé (réponse sous quelques jours)</li>
</ul>
<h2>Signaler une question</h2>
<p>Indique le thème, le niveau et le texte de la question (ou une capture d’écran) : elle sera vérifiée et corrigée si besoin.</p>
<h2>Données personnelles et cookies</h2>
<p>Le site fonctionne sans compte et ne stocke tes préférences que dans ton navigateur. Le détail est dans la page <a href="/confidentialite">Confidentialité</a>. Pour exercer tes droits (RGPD), écris-moi par le canal ci-dessus.</p>`

  return page({
    url: '/contact',
    title: 'Contact : signaler une erreur, proposer un thème',
    description: clip(
      `Pour signaler une erreur dans une question, proposer un thème ou poser une question sur les données : ${CONTACT_EMAIL ? 'email et Instagram' : 'Instagram'} du créateur de Quizz.`,
    ),
    current: '/contact',
    crumbs: [['Contact', '/contact']],
    sources: SRC_PAGES,
    ads: false,
    body,
  })
}

// « Dernière mise à jour : 7 septembre 2026 » à partir de la date ISO nue
// (AAAA-MM-JJ, ou une phrase qui la contient) de legal.js. Midi local : aucun
// fuseau ne peut faire reculer le jour. Sans date reconnaissable, le texte
// est rendu tel quel.
export function legalUpdatedText(updated) {
  const iso = (String(updated ?? '').match(/\d{4}-\d{2}-\d{2}/) || [])[0]
  if (!iso) return String(updated ?? '')
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return String(updated)
  return `Dernière mise à jour : ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(date)}`
}

// Pages légales rendues DEPUIS src/content/legal.js (français) : une seule
// source de vérité, partagée avec la modale de l'app. Chaque section est
// [titre, texte] ou [titre, [paragraphe, ...]] ; le texte est du texte brut,
// les URL nues deviennent des liens.
export function pageLegal(kind) {
  const data = LEGAL[kind].fr
  const url = kind === 'privacy' ? '/confidentialite' : '/conditions'
  const sections = data.sections
    .map(([h, text]) => {
      const paras = Array.isArray(text) ? text : [text]
      return `<section class="legal-section"><h2>${esc(h)}</h2>${paras.map((p) => `<p>${autoLink(esc(p))}</p>`).join('')}</section>`
    })
    .join('\n')
  const body = `<h1>${esc(data.title)}</h1>
<p class="legal-updated">${esc(legalUpdatedText(data.updated))}</p>
${sections}`

  return page({
    url,
    title: `${data.title} : Quizz`,
    // Fidèle à legal.js : préférences et progression dans le navigateur, seul
    // l'email d'un acheteur Premium (et son statut) est conservé côté serveur.
    description: clip(
      kind === 'privacy'
        ? 'Ce que Quizz stocke : préférences et progression dans ton navigateur, seul l’email d’un acheteur Premium reste côté serveur. Cookies, AdSense, tes droits.'
        : 'Conditions d’utilisation de Quizz : jeu gratuit et sans compte, contenu ludique, offre Premium sans publicité, responsabilité, contact.',
    ),
    current: '',
    crumbs: [[data.title, url]],
    sources: ['src/content/legal.js'],
    ads: false,
    body,
  })
}

// Page transversale : les paires qu'on confond, toutes familles mélangées.
// Les fiches individuelles répondent à « panneau B15 » ; celle-ci répond à
// « panneaux qui se ressemblent », qui ne vise aucun panneau en particulier.
export function pagePieges() {
  const parFamille = FAMILIES.map((f) => {
    // Une paire est classée dans la famille de son premier panneau, pour éviter
    // de la lister deux fois quand elle traverse deux familles.
    const paires = CONFUSIONS.filter((c) => getSign(c.a).family === f.id)
    if (!paires.length) return ''
    const items = paires
      .map(({ a, b, tip }) => {
        const sa = getSign(a)
        const sb = getSign(b)
        return `<li class="confusion">
<div class="confusion-pair">
<a class="sign-card" href="/panneaux/${sa.id}"><span class="sign-image" aria-hidden="true">${sa.svg}</span><span class="sign-code">${esc(sa.code)}</span></a>
<span class="confusion-vs" aria-hidden="true">≠</span>
<a class="sign-card" href="/panneaux/${sb.id}"><span class="sign-image" aria-hidden="true">${sb.svg}</span><span class="sign-code">${esc(sb.code)}</span></a>
</div>
<p><b>${esc(sa.code)} ou ${esc(sb.code)} ?</b> ${esc(tip)}</p>
</li>`
      })
      .join('')
    return `<section id="${f.id}"><h2>${f.emoji} ${esc(f.label)} <span class="pill">${paires.length} paire${paires.length > 1 ? 's' : ''}</span></h2><ul class="confusion-list">${items}</ul></section>`
  }).join('')

  // La page est longue par nature : on donne les raccourcis d'entrée plutôt que
  // d'obliger à faire défiler six familles pour trouver la bonne.
  const sommaire = FAMILIES.filter((f) => CONFUSIONS.some((c) => getSign(c.a).family === f.id))
    .map((f) => `<a href="#${f.id}">${f.emoji} ${esc(f.label)}</a>`)
    .join('')

  const body = `<h1>Les ${CONFUSIONS.length} paires de panneaux qu’on confond</h1>
<p class="lead">Perdre un point au code, ce n’est presque jamais ignorer un panneau : c’est en prendre un pour un autre. Voici les paires qui piègent le plus, mises côte à côte, avec la règle qui les sépare en une phrase.</p>
<p>Un réflexe règle déjà la moitié des cas : <strong>la forme et la couleur annoncent la nature du message avant même le dessin</strong>. Triangle à bord rouge, on vous prévient. Rond cerclé de rouge, on vous interdit. Rond bleu, on vous oblige. Carré bleu, on vous informe. Panneau barré, la règle précédente s’arrête. Deux panneaux au même dessin mais de forme différente ne disent donc jamais la même chose.</p>
${playButtons('panneaux')}
<nav class="toc" aria-label="Familles de panneaux">${sommaire}</nav>
${parFamille}
<h2>S’entraîner</h2>
<p>Le mode Expert du <a href="/quiz/panneaux">quiz Panneaux</a> est construit sur ce principe : les mauvaises réponses proposées sont des panneaux proches, pas des panneaux au hasard. C’est là qu’on voit si la distinction est acquise. Les ${SIGNS.length} fiches sont dans <a href="/panneaux/">la liste complète des panneaux</a>, et l’<a href="${EXAM_URL}">examen blanc</a> vérifie le tout en conditions réelles.</p>`

  return page({
    url: '/panneaux/pieges',
    title: `Panneaux qui se ressemblent : les ${CONFUSIONS.length} pièges du code`,
    description: clip(
      `B15 ou C18, AB3a ou STOP, B14 ou B33 : les ${CONFUSIONS.length} paires de panneaux les plus confondues au code de la route, côte à côte, avec la règle qui les sépare.`,
    ),
    current: '/panneaux/',
    crumbs: [
      ['Panneaux', '/panneaux/'],
      ['Pièges', '/panneaux/pieges'],
    ],
    jsonld: [
      faqLd(
        CONFUSIONS.map(({ a, b, tip }) => ({
          q: `Quelle est la différence entre les panneaux ${getSign(a).code} et ${getSign(b).code} ?`,
          a: tip,
        })),
      ),
    ],
    sources: SRC_SIGNS,
    body,
  })
}

// Page « introuvable », servie par le Worker avec le statut 404
// (not_found_handling: "404-page"). Hors sitemap, noindex, sans publicité.
export function page404() {
  const body = `<div class="notfound">
<span class="q-mark" aria-hidden="true">?</span>
<h1>Page introuvable</h1>
<p class="lead">Cette adresse ne mène nulle part : la page a été déplacée, ou le lien est incomplet.</p>
</div>
<h2>Par où continuer</h2>
<div class="cat-links">
<a class="cat-card" href="/"><span class="cat-ic" style="--cat:#f59e0b">🏠</span><span class="cat-tx"><span class="cat-label">Accueil</span><span class="cat-count">Jouer à Quizz</span></span><span class="cat-go" aria-hidden="true">›</span></a>
<a class="cat-card" href="/panneaux/"><span class="cat-ic" style="--cat:#16a34a">🚸</span><span class="cat-tx"><span class="cat-label">Panneaux</span><span class="cat-count">Les ${SIGNS.length} panneaux du code, avec leur fiche</span></span><span class="cat-go" aria-hidden="true">›</span></a>
<a class="cat-card" href="/quiz/"><span class="cat-ic" style="--cat:#6366f1">🧠</span><span class="cat-tx"><span class="cat-label">Quiz</span><span class="cat-count">${CATS.length} thèmes, ${fmt(TOTAL)} questions</span></span><span class="cat-go" aria-hidden="true">›</span></a>
<a class="cat-card" href="${APP.exam}"><span class="cat-ic" style="--cat:#ef4444">📝</span><span class="cat-tx"><span class="cat-label">Examen blanc</span><span class="cat-count">${EXAM.questions} questions au format du code</span></span><span class="cat-go" aria-hidden="true">›</span></a>
</div>`

  return page({
    url: '/404.html',
    title: 'Page introuvable',
    description: 'Cette page n’existe pas sur Quizz. Retour à l’accueil, aux panneaux, aux quiz ou à l’examen blanc.',
    sources: SRC_PAGES,
    sitemap: false,
    noindex: true,
    ads: false,
    body,
  })
}

// Toutes les pages, dans l'ordre du sitemap.
export function allPages() {
  return [
    pageQuizHub(),
    ...CATS.map(pageCategory),
    pageExamBlanc(),
    pagePanneauxIndex(),
    pagePieges(),
    ...SIGNS.map(pageSign),
    pageAbout(),
    pageContact(),
    pageLegal('privacy'),
    pageLegal('terms'),
    page404(),
  ]
}

// ---------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------

function urlToFile(url) {
  if (url.endsWith('.html')) return path.join(DIST, url)
  if (url.endsWith('/')) return path.join(DIST, url, 'index.html')
  return path.join(DIST, `${url}.html`)
}

export function sitemapXml(entries) {
  const rows = entries.map(
    ({ url, lastmod }) => `  <url><loc>${SITE}${url}</loc><lastmod>${lastmod}</lastmod></url>`,
  )
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows.join('\n')}
</urlset>
`
}

function main() {
  if (!existsSync(path.join(DIST, 'assets'))) fail('dist/assets introuvable : lancer `vite build` d’abord.')
  const cssFile = readdirSync(path.join(DIST, 'assets')).find((f) => /^index-.*\.css$/.test(f))
  if (!cssFile) fail('feuille de style index-*.css introuvable dans dist/assets.')
  cssHref = `/assets/${cssFile}`

  const buildDate = new Date().toISOString()
  const pages = allPages()
  const dashes = []
  for (const p of pages) {
    const file = urlToFile(p.url)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, p.html)
    if (p.html.includes('\u2014')) dashes.push(p.url)
  }
  // Règle de contenu : jamais de tiret long dans un texte affiché. Avertit sans
  // casser le build (le texte peut venir d'un autre chantier : legal.js, signs.js).
  if (dashes.length) console.warn(`build-pages : tiret long (U+2014) dans ${dashes.join(', ')}`)

  const entries = [
    { url: '/', lastmod: lastmodOf(['index.html', 'scripts/site-data.mjs', 'src/content/counts.json'], buildDate) },
    ...pages.filter((p) => p.sitemap).map((p) => ({ url: p.url, lastmod: lastmodOf(p.sources, buildDate) })),
  ]
  writeFileSync(path.join(DIST, 'sitemap.xml'), sitemapXml(entries))

  console.log(
    `build-pages : ${pages.length} pages statiques écrites dans dist/ (feuille de style ${cssFile}), sitemap de ${entries.length} URL.`,
  )
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
