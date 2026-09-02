// Données partagées par le générateur de pages statiques (build-pages.mjs) et
// par le plugin Vite qui pré-remplit l'accueil (vite-plugin-home-shell.mjs).
//
// Pourquoi ces pages existent : l'app est une SPA (le HTML brut ne contient que
// <div id="root">). Pour les robots (Google, examen AdSense) et les visiteurs
// sans JavaScript, le site paraissait vide. Ces pages donnent un vrai contenu
// lisible : fiches panneaux, pages par thème, à-propos, contact, pages légales.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const SITE = 'https://ryo-offc.com'
export const SITE_NAME = 'Quizz - Qui est le meilleur ?'
export const INSTAGRAM = 'https://www.instagram.com/ryo.offc/'
// Adresse de contact publique (déjà publique via les commits GitHub du projet).
export const CONTACT_EMAIL = 'ryoyuuki.fr@gmail.com'
export const ADSENSE_CLIENT = 'ca-pub-1164405138212191'

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
      'Priorités, vitesses, signalisation, sanctions : un entraînement gratuit et sans inscription pour l’épreuve théorique du code.',
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

// Accueil pré-rendu, injecté dans <div id="root"> à la construction. React le
// remplace au montage (createRoot vide le conteneur) : les visiteurs ne voient
// que l'app ; les robots et les navigateurs sans JavaScript voient ce contenu.
// Les classes sont celles de l'app (src/index.css) pour un rendu identique.
export function renderHomeShell(counts) {
  const total = totalQuestions(counts)
  const hero = CATS.find((c) => c.hero)
  const others = CATS.filter((c) => !c.hero)
  const card = (c) => `<a class="cat-card" href="/quiz/${c.id}">
      <span class="cat-ic" style="--cat:${c.color}">${c.emoji}</span>
      <span class="cat-tx"><span class="cat-label">${esc(c.label)}</span><span class="cat-count">${fmt(catTotal(counts, c))} questions</span></span>
      <span class="cat-go" aria-hidden="true">›</span>
    </a>`
  return `<div class="app"><div class="home">
  <header class="home-head">
    <span class="q-mark" style="width:46px;height:46px;font-size:26px" aria-hidden="true">Q</span>
    <div><h1 class="logo">Quizz</h1><p class="home-title">Qui est le meilleur ?</p></div>
  </header>
  <p class="home-tagline">Quiz gratuit, sans compte : ${fmt(total)} questions, ${CATS.length} thèmes, en solo ou en défi entre potes.</p>
  <section class="categories">
    <span class="field-label">Choisis une catégorie</span>
    <a class="hero-card" href="/quiz/${hero.id}">
      <span class="hero-badge">${fmt(catTotal(counts, hero))} QUESTIONS</span>
      <span class="hero-row">
        <span class="cat-ic" style="--cat:${hero.color}">${hero.emoji}</span>
        <span class="cat-tx"><span class="hero-name">${esc(hero.label)}</span><span class="hero-sub">Révise sérieusement, ou défie un pote</span></span>
        <span class="cat-go" aria-hidden="true">›</span>
      </span>
    </a>
    <div class="cat-list">${others.map(card).join('')}</div>
  </section>
  <nav class="home-links" aria-label="Pages du site">
    <a href="/panneaux/">Réviser les 62 panneaux</a> · <a href="/a-propos">À propos</a> · <a href="/contact">Contact</a>
  </nav>
</div></div>`
}
