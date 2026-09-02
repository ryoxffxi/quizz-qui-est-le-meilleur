// Génère, APRÈS `vite build`, les pages HTML statiques du site dans dist/ :
//   /panneaux/            galerie des 62 panneaux par famille
//   /panneaux/<id>        une fiche par panneau (visuel, code, signification)
//   /quiz/<catégorie>     une page par thème, avec des exemples de questions
//   /a-propos  /contact   /confidentialite  /conditions
//   /sitemap.xml          toutes les URL ci-dessus + l'accueil
//
// Ces pages donnent aux robots (Google, examen AdSense) et aux navigateurs sans
// JavaScript un vrai contenu lisible ; l'app (index.html) reste seule à faire
// jouer. Elles réutilisent la feuille de style de l'app (dist/assets/index-*.css)
// pour partager son identité visuelle, plus quelques règles propres aux pages.
//
// Adressage Cloudflare (Workers Static Assets, html_handling auto-trailing-slash) :
// un fichier `x.html` est servi sur `/x` (sans slash), un `dossier/index.html`
// sur `/dossier/` (avec slash). Les URL déclarées ici respectent cette règle.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { FAMILIES, SIGNS, getSign } from '../src/content/panneaux/signs.js'
import { LEGAL } from '../src/content/legal.js'
import {
  ADSENSE_CLIENT,
  CATS,
  CONTACT_EMAIL,
  INSTAGRAM,
  ROOT,
  SITE,
  SITE_NAME,
  catTotal,
  esc,
  fill,
  fmt,
  readCounts,
  totalQuestions,
} from './site-data.mjs'

const DIST = path.join(ROOT, 'dist')

function fail(msg) {
  console.error('build-pages :', msg)
  process.exit(1)
}

if (!existsSync(path.join(DIST, 'assets'))) fail('dist/assets introuvable : lancer `vite build` d’abord.')
const cssFile = readdirSync(path.join(DIST, 'assets')).find((f) => /^index-.*\.css$/.test(f))
if (!cssFile) fail('feuille de style index-*.css introuvable dans dist/assets.')
const CSS_HREF = `/assets/${cssFile}`

const counts = readCounts()
const TOTAL = totalQuestions(counts)
const PAN = CATS.find((c) => c.id === 'panneaux')
const written = [] // { url, file }

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
.qa .why{margin:0;font-size:.88rem;color:var(--text-dim)}
.cat-links{display:flex;flex-direction:column;gap:10px;margin-top:8px}
a.cat-card{text-decoration:none}
.pager{display:flex;justify-content:space-between;gap:10px;margin-top:26px;font-size:.9rem}
.related .sign-name-sm{display:none}
@media (max-width:520px){.sign-grid{grid-template-columns:repeat(3,1fr)}.page-main h1{font-size:1.5rem}}
`

const INSTA_SVG = `<svg class="insta-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><defs><linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#feda75"/><stop offset="0.35" stop-color="#fa7e1e"/><stop offset="0.62" stop-color="#d62976"/><stop offset="1" stop-color="#962fbf"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5.5" fill="none" stroke="url(#ig-grad)" stroke-width="2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="url(#ig-grad)" stroke-width="2"/><circle cx="17.4" cy="6.6" r="1.35" fill="url(#ig-grad)"/></svg>`

const NAV = [
  ['/', 'Jouer'],
  ['/panneaux/', 'Panneaux'],
  ['/a-propos', 'À propos'],
  ['/contact', 'Contact'],
]

function header(current) {
  const links = NAV.map(
    ([href, label]) =>
      `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`,
  ).join('')
  return `<header class="page-top"><a class="brand" href="/"><span class="q-mark" aria-hidden="true">Q</span>Quizz</a><nav class="page-nav" aria-label="Navigation">${links}</nav></header>`
}

function footer() {
  const links = [
    ['/', 'Accueil'],
    ['/panneaux/', 'Panneaux'],
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

function layout({ title, description, url, body, crumbs = [], current = '' }) {
  const canonical = SITE + url
  const bc = crumbs.length ? breadcrumbs(crumbs) : null
  return `<!doctype html>
<html lang="fr" data-theme="volt">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${canonical}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<meta name="theme-color" content="#0a0d16" />
<script>try{var t=localStorage.getItem('quizz_theme');document.documentElement.dataset.theme=t==='crimson'?'crimson':'volt'}catch(e){}</script>
<link rel="preload" href="/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="${CSS_HREF}" />
<style>${PAGE_CSS}</style>
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${esc(SITE_NAME)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>
${bc ? `<script type="application/ld+json">${JSON.stringify(bc.ld)}</script>` : ''}
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

// Coupe un texte au dernier espace avant `max` caractères (meta description).
function clip(text, max = 155) {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)) + '…'
}

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

function urlToFile(url) {
  if (url.endsWith('/')) return path.join(DIST, url, 'index.html')
  return path.join(DIST, `${url}.html`)
}

function writePage(url, html) {
  const file = urlToFile(url)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, html)
  written.push({ url, file: path.relative(DIST, file) })
}

function signCard(s, { withName = true } = {}) {
  return `<a class="sign-card" href="/panneaux/${s.id}"><span class="sign-image" aria-hidden="true">${s.svg}</span><span class="sign-code">${esc(s.code)}</span>${withName ? `<span class="sign-name-sm">${esc(s.name)}</span>` : ''}</a>`
}

function catCard(c) {
  return `<a class="cat-card" href="/quiz/${c.id}"><span class="cat-ic" style="--cat:${c.color}">${c.emoji}</span><span class="cat-tx"><span class="cat-label">${esc(c.label)}</span><span class="cat-count">${fmt(catTotal(counts, c))} questions</span></span><span class="cat-go" aria-hidden="true">›</span></a>`
}

function playButtons(catId) {
  return `<div class="cta-row"><a class="btn btn-primary" href="/?jouer=${catId}&amp;niveau=facile">Jouer · Facile</a><a class="btn btn-secondary" href="/?jouer=${catId}&amp;niveau=expert">Jouer · Expert</a></div>`
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

function pagePanneauxIndex() {
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
${playButtons('panneaux')}
${families}
<h2>Aller plus loin</h2>
<p>Les panneaux ne sont qu’un chapitre : le <a href="/quiz/code-route">quiz Code de la route</a> couvre aussi les priorités, les vitesses, les sanctions et la sécurité du véhicule, avec ${fmt(catTotal(counts, CATS[0]))} questions expliquées.</p>`

  writePage(
    '/panneaux/',
    layout({
      title: `Les ${SIGNS.length} panneaux du code de la route : fiches et quiz`,
      description: `Révise les ${SIGNS.length} panneaux routiers essentiels par famille (danger, priorité, interdiction, obligation, indication) : visuel, code officiel, signification, puis quiz illustré gratuit.`,
      url: '/panneaux/',
      current: '/panneaux/',
      crumbs: [['Panneaux', '/panneaux/']],
      body,
    }),
  )
}

function pageSign(s, i) {
  const fam = FAMILIES.find((f) => f.id === s.family)
  const siblings = SIGNS.filter((x) => x.family === s.family && x.id !== s.id)
  const prev = SIGNS[(i - 1 + SIGNS.length) % SIGNS.length]
  const next = SIGNS[(i + 1) % SIGNS.length]
  const title = `Panneau ${s.code} : ${s.name}`
  const body = `<h1>${esc(s.name)}</h1>
<p><span class="pill">${esc(s.code)}</span><span class="pill">${fam.emoji} ${esc(fam.label)}</span></p>
<div class="sign-hero"><span class="sign-image" role="img" aria-label="Panneau ${esc(s.code)} : ${esc(s.name)}">${s.svg}</span></div>
<h2>Signification</h2>
<p>${esc(s.meaning)}</p>
<h2>La famille « ${esc(fam.label)} »</h2>
<p>${esc(fam.desc)} Cette famille compte ${siblings.length + 1} panneaux dans notre révision.</p>
<h2>Dans le quiz</h2>
<p>Ce panneau fait partie du quiz Panneaux (${fmt(catTotal(counts, PAN))} questions illustrées). En Facile, il faut le reconnaître parmi des panneaux d’autres familles ; en Expert, le distinguer de panneaux proches de la même famille. En révision solo, chaque réponse est corrigée tout de suite ; en défi, un lien permet à un ami de jouer les mêmes questions.</p>
${playButtons('panneaux')}
<h2>Autres panneaux de la famille ${esc(fam.label)}</h2>
<div class="sign-grid related">${siblings.map((x) => signCard(x, { withName: false })).join('')}</div>
<nav class="pager" aria-label="Panneau précédent / suivant"><a href="/panneaux/${prev.id}">← ${esc(prev.code)}</a><a href="/panneaux/">Tous les panneaux</a><a href="/panneaux/${next.id}">${esc(next.code)} →</a></nav>`

  writePage(
    `/panneaux/${s.id}`,
    layout({
      title,
      description: clip(`${s.name} (${s.code}), panneau de la famille ${fam.label.toLowerCase()} : ${s.meaning}`),
      url: `/panneaux/${s.id}`,
      current: '/panneaux/',
      crumbs: [
        ['Panneaux', '/panneaux/'],
        [s.code, `/panneaux/${s.id}`],
      ],
      body,
    }),
  )
}

function qaItem(q) {
  const opts = fr(q.options)
  const img = q.image
    ? `<span class="sign-image qa-img" aria-hidden="true">${getSign(q.image)?.svg ?? ''}</span>`
    : ''
  const options = opts
    .map((o, i) => `<li${i === q.correct ? ' class="ok"' : ''}>${esc(o)}${i === q.correct ? ' ✓' : ''}</li>`)
    .join('')
  return `<li>${img}<p class="q">${esc(fr(q.question))}</p><ol type="A">${options}</ol><p class="why">${esc(fr(q.explanation))}</p></li>`
}

function pageCategory(cat) {
  const c = counts[cat.bank] || { facile: 0, expert: 0 }
  const total = c.facile + c.expert
  const bank = JSON.parse(readFileSync(path.join(ROOT, 'src/content', `${cat.bank}.json`), 'utf8'))
  const easy = sample(bank.filter((q) => q.difficulty === 'facile'), seedOf(cat.id + ':facile'), 8)
  const hard = sample(bank.filter((q) => q.difficulty === 'expert'), seedOf(cat.id + ':expert'), 8)
  const frOnly = cat.id === 'code-route' || cat.id === 'panneaux'
  const others = CATS.filter((x) => x.id !== cat.id)

  const body = `<h1>Quiz ${esc(cat.label)} : ${fmt(total)} questions gratuites</h1>
<p class="lead">${esc(fill(cat.short, total))}</p>
<p><span class="pill">${c.facile} Facile</span><span class="pill">${c.expert} Expert</span><span class="pill">${frOnly ? 'Français' : 'FR · EN · ES · PT'}</span></p>
${cat.intro.map((p) => `<p>${esc(fill(p, total))}</p>`).join('\n')}
${playButtons(cat.id)}
<h2>Comment ça marche</h2>
<ul>
<li><strong>Révision solo</strong> : lots de 10 questions, correction immédiate avec explication, sans chrono. Les questions déjà vues ne reviennent pas avant d’avoir fait le tour de la banque.</li>
<li><strong>Défi entre potes</strong> : manches de 5 questions chronométrées, score à la vitesse. À la fin, un lien à partager : ton ami joue exactement les mêmes questions et vous comparez vos scores manche par manche.</li>
<li><strong>Fin de manche</strong> : score, précision, récap des erreurs et total cumulé de toutes tes parties.</li>
</ul>
<h2>Exemples de questions</h2>
<p>Un aperçu de la banque, avec la bonne réponse et son explication. Dans le jeu, l’ordre des réponses change à chaque partie.</p>
<h3>Niveau Facile</h3>
<ul class="qa">${easy.map(qaItem).join('')}</ul>
<h3>Niveau Expert</h3>
<ul class="qa">${hard.map(qaItem).join('')}</ul>
${cat.id === 'panneaux' ? `<p>Pour réviser avant de jouer : <a href="/panneaux/">les fiches des ${SIGNS.length} panneaux</a>.</p>` : ''}
<h2>Les autres thèmes</h2>
<div class="cat-links">${others.map(catCard).join('')}</div>`

  writePage(
    `/quiz/${cat.id}`,
    layout({
      title: `Quiz ${cat.label} : ${fmt(total)} questions gratuites, solo ou en défi`,
      description: clip(fill(cat.short, total)),
      url: `/quiz/${cat.id}`,
      current: '/',
      crumbs: [
        ['Quiz', '/'],
        [cat.label, `/quiz/${cat.id}`],
      ],
      body,
    }),
  )
}

function pageAbout() {
  const body = `<h1>À propos de Quizz</h1>
<p class="lead">Quizz (ryo-offc.com) est un jeu de quiz gratuit, sans compte et sans inscription, créé par Ryo, joueur et passionné de culture pop. L’idée de départ : réviser ou se défier entre amis en quelques secondes, depuis un téléphone, sans rien télécharger.</p>
<h2>Ce que tu trouves ici</h2>
<ul>
<li><strong>${fmt(TOTAL)} questions</strong> réparties en cinq thèmes : ${CATS.map((c) => `<a href="/quiz/${c.id}">${esc(c.label.toLowerCase())}</a>`).join(', ')}.</li>
<li><strong>Deux niveaux</strong> (Facile et Expert) et <strong>deux façons de jouer</strong> : la révision solo, avec correction immédiate et explication, et le défi chronométré, où un lien permet à un ami de jouer exactement les mêmes questions.</li>
<li>Un espace de <a href="/panneaux/">révision des ${SIGNS.length} panneaux</a> du code de la route, avec une fiche et un visuel pour chacun.</li>
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
</ul>
<h2>Une question, une erreur à signaler ?</h2>
<p>Voir la page <a href="/contact">Contact</a>. Chaque signalement est lu.</p>`

  writePage(
    '/a-propos',
    layout({
      title: 'À propos de Quizz : le jeu, son contenu, son modèle',
      description: `Qui est derrière Quizz, comment les ${fmt(TOTAL)} questions sont écrites et vérifiées, comment le site est financé, et les grandes étapes du projet.`,
      url: '/a-propos',
      current: '/a-propos',
      crumbs: [['À propos', '/a-propos']],
      body,
    }),
  )
}

function pageContact() {
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

  writePage(
    '/contact',
    layout({
      title: 'Contact : signaler une erreur, proposer un thème',
      description: `Pour signaler une erreur dans une question, proposer un thème ou poser une question sur les données : ${CONTACT_EMAIL ? 'email et Instagram' : 'Instagram'} du créateur de Quizz.`,
      url: '/contact',
      current: '/contact',
      crumbs: [['Contact', '/contact']],
      body,
    }),
  )
}

// Sections supplémentaires de la page Confidentialité (mentions attendues par
// AdSense : fournisseurs tiers, cookie DoubleClick, désactivation, CMP).
const PRIVACY_EXTRA = {
  'Publicité (Google AdSense)': `Ce site utilise Google AdSense pour afficher des annonces, uniquement sur l’écran de résultat. Google, en tant que fournisseur tiers, utilise des cookies (dont le cookie DoubleClick) pour diffuser des annonces en fonction de tes visites précédentes sur ce site ou sur d’autres sites. Tu peux désactiver la publicité personnalisée dans les <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">paramètres des annonces de Google</a> ou sur <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">aboutads.info</a>. Pour les visiteurs de l’Espace économique européen, du Royaume-Uni et de la Suisse, le consentement est recueilli par un message de consentement certifié (CMP Google) avant tout dépôt de cookie publicitaire ; il peut être modifié à tout moment. Pour en savoir plus : <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">comment Google utilise les informations issues des sites qui utilisent ses services</a>.`,
  'Mesure d’audience': `La fréquentation est mesurée avec Cloudflare Web Analytics, un outil sans cookie qui ne suit pas les visiteurs d’un site à l’autre. Le script n’est chargé qu’après un clic sur « Accepter » dans le bandeau de cookies.`,
  Paiements: `Les dons et l’offre Premium, quand ils sont proposés, sont réglés via Stripe : les données bancaires sont saisies sur les pages de Stripe et ne transitent jamais par ce site.`,
  Hébergement: `Le site est hébergé par Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis.`,
}

function pageLegal(kind) {
  const data = LEGAL[kind].fr
  const url = kind === 'privacy' ? '/confidentialite' : '/conditions'
  let sections = data.sections.map(([h, p]) => [h, esc(p)])
  if (kind === 'privacy') {
    // Remplace les sections courtes de l'app par leur version détaillée, puis
    // ajoute celles qui n'existent que sur cette page.
    sections = sections.map(([h, p]) => [h, PRIVACY_EXTRA[h] ?? p])
    for (const [h, p] of Object.entries(PRIVACY_EXTRA)) {
      if (!sections.some(([x]) => x === h)) sections.splice(sections.length - 1, 0, [h, p])
    }
    sections.push(['Contact', `Pour toute question sur tes données : voir la page <a href="/contact">Contact</a>.`])
  }
  const body = `<h1>${esc(data.title)}</h1>
<p class="legal-updated">${esc(data.updated)}</p>
${sections.map(([h, p]) => `<section class="legal-section"><h2>${esc(h)}</h2><p>${p}</p></section>`).join('\n')}`

  writePage(
    url,
    layout({
      title: `${data.title} : Quizz`,
      description:
        kind === 'privacy'
          ? 'Ce que Quizz stocke (rien côté serveur, préférences dans ton navigateur), cookies, publicité Google AdSense et consentement, mesure d’audience, tes droits.'
          : 'Conditions d’utilisation de Quizz : jeu gratuit et sans compte, contenu ludique, offre Premium sans publicité, responsabilité, contact.',
      url,
      current: '',
      crumbs: [[data.title, url]],
      body,
    }),
  )
}

function writeSitemap() {
  const urls = ['/', ...written.map((w) => w.url)]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>
`
  writeFileSync(path.join(DIST, 'sitemap.xml'), xml)
  return urls.length
}

// ---------------------------------------------------------------------------

pagePanneauxIndex()
SIGNS.forEach(pageSign)
CATS.forEach(pageCategory)
pageAbout()
pageContact()
pageLegal('privacy')
pageLegal('terms')
const n = writeSitemap()

console.log(`build-pages : ${written.length} pages statiques écrites dans dist/ (feuille de style ${cssFile}), sitemap de ${n} URL.`)
