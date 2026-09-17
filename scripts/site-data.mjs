// Données partagées par le générateur de pages statiques (build-pages.mjs) et
// par le plugin Vite qui pré-remplit l'accueil (vite-plugin-home-shell.mjs).
//
// Pourquoi ces pages existent : l'app est une SPA (le HTML brut ne contient que
// <div id="root">). Pour les robots (Google, examen AdSense) et les visiteurs
// sans JavaScript, le site paraissait vide. Ces pages donnent un vrai contenu
// lisible : fiches panneaux, pages par thème, examen blanc, à-propos, contact,
// pages légales.
//
// Tout ce qui est PUR (pas d'accès à dist/) vit ici pour être testable
// (scripts/site-data.test.mjs) sans lancer un build.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const SITE = 'https://ryo-offc.com'
export const SITE_NAME = 'Quizz'
export const SITE_TAGLINE = 'Qui est le meilleur ?'
export const INSTAGRAM = 'https://www.instagram.com/ryo.offc/'
// Adresse de contact affichée sur /contact. VIDE volontairement (02/09/2026) :
// Ryo ne veut pas exposer son Gmail personnel. À remplir avec une adresse
// dédiée (ex. contact@ryo-offc.com via Cloudflare Email Routing). Tant que
// c'est vide, la page Contact ne propose qu'Instagram.
export const CONTACT_EMAIL = ''
export const ADSENSE_CLIENT = 'ca-pub-1164405138212191'

// Chemins de l'app (contrat d'URL, vague 2). Les pages statiques pointent
// dessus dès maintenant : le Worker réécrit ces chemins vers index.html.
export const APP = {
  play: (cat, diff = 'facile') => `/jouer/${cat}/${diff}`,
  duel: (cat, diff = 'facile') => `/defi/${cat}/${diff}`,
  errors: (cat) => `/erreurs/${cat}`,
  exam: '/examen',
  daily: '/quotidien',
  signs: '/revision/panneaux',
  flashcards: '/flashcards',
}

// Réglages du jeu repris dans les textes (mêmes valeurs que src/lib/game.js :
// on ne l'importe pas pour garder ce module libre de tout code d'app).
export const GAME = {
  soloBatch: 10,
  duelRound: 5,
  duelSecondsFacile: 10,
  duelSecondsExpert: 7,
  examQuestions: 40,
  examPass: 35,
  examSeconds: 20,
  examSignQuestions: 8,
  dailyQuestions: 10,
}

// L'épreuve théorique générale (ETG) en 2026 : les chiffres cités sur
// /quiz/code-route et /code-de-la-route/examen-blanc. Une seule source.
export const EXAM = {
  questions: 40,
  pass: 35,
  seconds: 20,
  price: 30,
  resultDelay: '24 à 48 heures',
  validityYears: 5,
  bankRewritten: '12 septembre 2023',
  decree: 'arrêté du 16 avril 2026',
  closeRegistration: '1er juillet 2026',
}

// Les 10 thèmes officiels de l'ETG. L'id sert de clé au champ `theme` des
// questions de code-route (chantier contenu) ; le libellé est celui du
// programme officiel.
export const EXAM_THEMES = [
  { id: 'circulation', label: 'La circulation routière' },
  { id: 'conducteur', label: 'Le conducteur' },
  { id: 'route', label: 'La route' },
  { id: 'usagers', label: 'Les autres usagers' },
  { id: 'notions', label: 'Les notions diverses' },
  { id: 'secours', label: 'Les premiers secours' },
  { id: 'vehicule', label: 'Prendre et quitter son véhicule' },
  { id: 'mecanique', label: 'La mécanique et les équipements' },
  { id: 'securite', label: 'La sécurité du passager et du véhicule' },
  { id: 'environnement', label: "L'environnement" },
]

// Questions fréquentes sur l'examen (FAQPage JSON-LD de /quiz/code-route et de
// la landing examen blanc). Les réponses reprennent EXAM : rien n'est écrit
// deux fois.
export const EXAM_FAQ = [
  {
    q: "Combien de questions à l'examen du code de la route ?",
    a: `L'épreuve compte ${EXAM.questions} questions à choix multiples. Il faut au moins ${EXAM.pass} bonnes réponses sur ${EXAM.questions} pour être reçu, soit 5 erreurs au maximum.`,
  },
  {
    q: 'Combien de temps a-t-on par question ?',
    a: `Environ ${EXAM.seconds} secondes par question, après l'affichage de la vidéo ou de la photo. Passé ce délai, la question est comptée fausse. L'examen blanc de Quizz applique le même chronomètre.`,
  },
  {
    q: 'Combien coûte le passage du code ?',
    a: `${EXAM.price} euros par présentation dans un centre agréé (La Poste, SGS, Dekra, Bureau Veritas, Pearson Vue). Le résultat est envoyé par e-mail sous ${EXAM.resultDelay}.`,
  },
  {
    q: 'Combien de temps le code reste-t-il valable ?',
    a: `${EXAM.validityYears} ans à compter de la date de réussite, dans la limite de 5 présentations à l'épreuve pratique.`,
  },
  {
    q: 'Quels sont les thèmes du code de la route ?',
    a: `Les questions sont réparties en 10 thèmes officiels : ${EXAM_THEMES.map((t) => t.label.toLowerCase()).join(', ')}.`,
  },
  {
    q: "Peut-on s'inscrire le jour même ?",
    a: `Non. Depuis le ${EXAM.closeRegistration}, en application de l'${EXAM.decree}, les inscriptions ferment la veille de la session. Il faut réserver son créneau à l'avance, avec son numéro NEPH.`,
  },
]

// Catégories dans l'ordre d'affichage de l'accueil (héros Code de la route en
// tête, puis l'ordre de src/content/index.js). Les textes {n} reçoivent le
// nombre de questions de la catégorie au moment du rendu.
export const CATS = [
  {
    id: 'code-route',
    bank: 'code-route',
    label: 'Code de la route',
    emoji: '🚦',
    color: '#f59e0b',
    hero: true,
    short:
      'Priorités, vitesses, signalisation, sanctions : un entraînement gratuit et sans inscription pour l’épreuve théorique du code, avec un examen blanc de 40 questions.',
    intro: [
      'Le quiz Code de la route rassemble {n} questions qui couvrent les grands chapitres de l’épreuve théorique : règles de priorité, vitesses et circulation, signalisation, permis et sanctions, véhicule et sécurité.',
      'Chaque question propose quatre réponses. En révision solo, la correction est immédiate et accompagnée d’une explication courte : on comprend son erreur tout de suite, sans attendre la fin. Les questions déjà vues sont mémorisées pour ne pas retomber dessus au retour sur le site.',
      'Ce contenu est un complément d’entraînement, gratuit et sans inscription. Il ne remplace ni la formation en auto-école ni le Code de la route officiel : en cas de doute, la règle officielle prime.',
    ],
  },
  {
    id: 'culture-generale',
    bank: 'culture-generale',
    label: 'Culture Générale',
    emoji: '🧠',
    color: '#6366f1',
    short:
      'Géographie, histoire, sciences, arts, sport : {n} questions pour réviser ou briller en soirée, en 4 langues.',
    intro: [
      'Le quiz Culture générale mélange géographie, histoire, sciences, langues, arts, littérature et sport : {n} questions, moitié Facile, moitié Expert, chacune avec une explication courte pour retenir la bonne réponse.',
      'Il se joue en révision solo (correction immédiate, sans chrono) ou en défi entre potes : un lien permet à un ami de jouer exactement les mêmes questions, puis vous comparez vos scores manche par manche.',
      'Les questions existent en français, anglais, espagnol et portugais : la langue se choisit en haut de l’écran de jeu.',
    ],
  },
  {
    id: 'manga-anime',
    bank: 'manga-anime',
    label: 'Manga & Animé',
    emoji: '🍥',
    color: '#ec4899',
    short:
      'One Piece, Naruto, Dragon Ball, films d’animation… {n} questions sur les mangas et les animés, du classique au récent.',
    intro: [
      'Le quiz Manga & Animé couvre les grands shōnen, les films d’animation, les personnages, les auteurs et les univers cultes : {n} questions pour tester ta culture otaku.',
      'Le niveau Facile vérifie les bases que tout fan connaît ; le niveau Expert va chercher les détails : personnages secondaires, studios, dates, techniques et répliques.',
      'Solo pour réviser tranquillement, ou défi chronométré pour départager les fans.',
    ],
  },
  {
    id: 'panneaux',
    bank: 'panneaux-quiz',
    label: 'Panneaux routiers',
    emoji: '🚸',
    color: '#16a34a',
    short:
      '{n} questions illustrées pour reconnaître les 62 panneaux essentiels du code de la route, famille par famille.',
    intro: [
      'Le quiz Panneaux affiche un panneau et demande sa signification : {n} questions illustrées, construites à partir des 62 panneaux de notre fiche de révision (danger, priorité, interdiction, fin d’interdiction, obligation, indication).',
      'En Facile, les mauvaises réponses viennent d’autres familles : il suffit de reconnaître la forme et la couleur. En Expert, elles viennent de la même famille : il faut lire le pictogramme et connaître la nuance.',
      'Avant de jouer, révise chaque panneau sur sa fiche : visuel, code officiel et signification.',
    ],
  },
  {
    id: 'cinema-series',
    bank: 'cinema-series',
    label: 'Cinéma & Séries',
    emoji: '🎬',
    color: '#06b6d4',
    short:
      'Réalisateurs, répliques, acteurs, séries cultes : {n} questions sur le cinéma et les séries, en 4 langues.',
    intro: [
      'Le quiz Cinéma & Séries passe en revue les films et les séries qui ont marqué le public : réalisateurs, acteurs, répliques, personnages, récompenses et dessins animés. {n} questions, du blockbuster au film d’auteur.',
      'Facile pour les soirées entre amis, Expert pour les vrais cinéphiles. Chaque réponse est expliquée en une phrase.',
      'Disponible en français, anglais, espagnol et portugais.',
    ],
  },
]

export function readCounts() {
  return JSON.parse(readFileSync(path.join(ROOT, 'src/content/counts.json'), 'utf8'))
}

export function catTotal(counts, cat) {
  const c = counts[cat.bank] || {}
  return (c.facile || 0) + (c.expert || 0)
}

export function totalQuestions(counts) {
  return CATS.reduce((n, c) => n + catTotal(counts, c), 0)
}

// « 2 140 » (espace fine insécable, usage français).
export function fmt(n) {
  return new Intl.NumberFormat('fr-FR').format(n)
}

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Remplace {n} par le nombre de questions de la catégorie.
export function fill(text, n) {
  return text.replace(/\{n\}/g, fmt(n))
}

// Coupe un texte au dernier espace avant `max` caractères (meta description,
// titre trop long). Le résultat fait toujours au plus `max` caractères.
export function clip(text, max = 155) {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)) + '…'
}

// Texte brut d'un fragment HTML (comptage de mots, tests).
export function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function wordCount(html) {
  const text = stripTags(html)
  return text ? text.split(' ').length : 0
}

// Rend cliquables les URL nues d'un texte déjà échappé (pages légales : le
// texte source est du texte brut, pas du HTML). Le point ou la parenthèse qui
// suit une URL n'en fait pas partie.
export function autoLink(escapedText) {
  return escapedText.replace(/https?:\/\/[^\s<]+?(?=[.,;)]?(?:\s|$))/g, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  })
}

// Date de dernière modification d'un groupe de fichiers sources (sitemap
// <lastmod>) : la plus récente des dates de commit (`git log -1`), en repli la
// date du build. Un fichier absent ou jamais commité est ignoré. Résultat au
// format W3C (ISO 8601), tel que l'attend le sitemap.
const gitDates = new Map()
export function lastmodOf(files, fallback = new Date().toISOString()) {
  let best = null
  for (const file of files) {
    if (!gitDates.has(file)) {
      let date = null
      try {
        const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', file], {
          cwd: ROOT,
          stdio: ['ignore', 'pipe', 'ignore'],
          encoding: 'utf8',
        }).trim()
        if (out && !Number.isNaN(Date.parse(out))) date = out
      } catch {
        date = null
      }
      gitDates.set(file, date)
    }
    const d = gitDates.get(file)
    if (d && (!best || Date.parse(d) > Date.parse(best))) best = d
  }
  return best ?? fallback
}

// Accueil pré-rendu, injecté dans <div id="root"> à la construction. React le
// remplace au montage (createRoot vide le conteneur) : les visiteurs ne voient
// que l'app ; les robots et les navigateurs sans JavaScript voient ce contenu.
//
// Les classes sont celles de l'app (src/index.css). Les blocs onglets et
// sélecteurs sont inertes (des <span>, pas des boutons) mais gardent les mêmes
// classes : ils réservent la même hauteur que l'app, donc pas de saut de mise
// en page (CLS) quand React prend la main. Le texte de présentation vient
// APRÈS les cartes, sous la ligne de flottaison sur mobile, pour la même raison.
export function renderHomeShell(counts) {
  const total = totalQuestions(counts)
  const hero = CATS.find((c) => c.hero)
  const others = CATS.filter((c) => !c.hero)
  // Même structure que Home.jsx : conteneur .cat-card (colonne) > lien .cat-main.
  const card = (c) => `<span class="cat-card"><a class="cat-main" href="${APP.play(c.id)}">
      <span class="cat-ic" style="--cat:${c.color}">${c.emoji}</span>
      <span class="cat-tx"><span class="cat-label">${esc(c.label)}</span><span class="cat-count">${fmt(catTotal(counts, c))} questions</span></span>
      <span class="cat-go" aria-hidden="true">›</span>
    </a></span>`
  const seg = (a, b) =>
    `<span class="seg" style="--count:2"><span class="seg-thumb"></span><span class="seg-opt active">${a}</span><span class="seg-opt">${b}</span></span>`
  // Chips inertes du défi du jour (le héros = catégorie du jour par défaut en FR).
  const chips = CATS.map(
    (c) => `<span class="fam-chip${c.hero ? ' active' : ''}">${esc(c.label)}</span>`,
  ).join('')
  return `<div class="app"><div class="home">
  <header class="home-head">
    <span class="q-mark" style="width:46px;height:46px;font-size:26px" aria-hidden="true">Q</span>
    <div><p class="logo">${SITE_NAME}</p><p class="home-title">${esc(SITE_TAGLINE)}</p></div>
  </header>
  <h1 class="home-tagline" style="font-weight:600">Quiz gratuit, sans inscription : code de la route, culture générale, manga, cinéma</h1>
  <section class="home-progress is-empty" aria-hidden="true"><p class="progress-empty">Joue une première partie : ta progression s’affichera ici.</p></section>
  <div class="home-tabs" aria-hidden="true"><span class="home-tab active">Quiz</span><span class="home-tab">Panneaux</span></div>
  <section class="selectors" aria-hidden="true">
    <div class="field"><span class="field-label">Mode</span>${seg('Réviser solo', 'Défi entre potes')}<p class="field-help">Solo : banque complète par lots de ${GAME.soloBatch}, correction immédiate, sans chrono.</p></div>
    <div class="field"><span class="field-label">Niveau</span>${seg('Facile', 'Expert')}</div>
  </section>
  <section class="categories">
    <section class="daily-card" aria-label="Défi du jour">
      <div class="daily-head"><span class="daily-kicker">Défi du jour</span></div>
      <span class="fam-chips daily-chips" aria-hidden="true">${chips}</span>
      <p class="daily-sub">${GAME.dailyQuestions} questions, les mêmes pour tout le monde.</p>
      <a class="btn btn-primary daily-go" href="${APP.daily}">Jouer le défi du jour</a>
    </section>
    <span class="field-label">Choisis une catégorie</span>
    <div class="hero-card">
      <a class="hero-main" href="${APP.play(hero.id)}">
        <span class="hero-badge">${fmt(catTotal(counts, hero))} QUESTIONS</span>
        <span class="hero-row">
          <span class="cat-ic" style="--cat:${hero.color}">${hero.emoji}</span>
          <span class="cat-tx"><span class="hero-name">${esc(hero.label)}</span><span class="hero-sub">Révise sérieusement, ou défie un pote</span></span>
          <span class="cat-go" aria-hidden="true">›</span>
        </span>
      </a>
      <div class="hero-exam">
        <p class="hero-exam-sub">Examen blanc : ${GAME.examQuestions} questions, ${GAME.examPass} pour être reçu</p>
        <div class="hero-ready"><span class="hero-ready-row"><span class="hero-ready-label">Prêt pour l’examen ?</span><span class="hero-ready-value">Aucun examen encore</span></span><span class="cat-gauge" aria-hidden="true"><span class="cat-gauge-fill"></span></span></div>
        <div class="hero-actions"><a class="btn btn-primary hero-exam-btn" href="${APP.exam}">Passer un examen blanc</a></div>
      </div>
    </div>
    <div class="cat-list">${others.map(card).join('')}</div>
  </section>
  <section class="home-seo" style="margin-top:26px;font-size:.92rem;line-height:1.55;color:var(--text-dim)">
    <h2 style="font-size:1.05rem;color:var(--text);margin:0 0 8px">Gratuit, sans compte, seul ou entre potes</h2>
    <p>Quizz réunit ${fmt(total)} questions en ${CATS.length} thèmes : code de la route, panneaux, culture générale, manga, cinéma. Sans inscription ni téléchargement : tu ouvres la page et tu joues.</p>
    <p>Trois façons de jouer : le <a href="${APP.play('culture-generale')}">solo</a>, par lots de ${GAME.soloBatch} questions corrigées tout de suite ; le <a href="${APP.duel('culture-generale')}">défi entre potes</a>, avec un lien pour qu'un ami joue les mêmes questions ; l'<a href="${APP.exam}">examen blanc</a> du code, ${GAME.examQuestions} questions à ${GAME.examSeconds} secondes, reçu à partir de ${GAME.examPass}. Le <a href="${APP.daily}">défi du jour</a> propose ${GAME.dailyQuestions} questions identiques pour tous, chaque jour.</p>
    <p>Deux niveaux, Facile et Expert. Quatre langues (français, anglais, espagnol, portugais), sauf le code de la route, qui reste en français.</p>
    <p>Pour le code, commence par les <a href="/panneaux/pieges">paires de panneaux qui se ressemblent</a>, puis passe un <a href="/code-de-la-route/examen-blanc">examen blanc du code de la route</a>. Tous les thèmes sont sur la <a href="/quiz/">page des quiz</a>.</p>
  </section>
  <nav class="home-links" aria-label="Pages du site">
    <a href="/panneaux/">Réviser les 62 panneaux</a> · <a href="${APP.exam}">Examen blanc</a> · <a href="/a-propos">À propos</a> · <a href="/contact">Contact</a>
  </nav>
</div></div>`
}
