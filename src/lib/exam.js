// Examen blanc du code de la route (format ETG 2026) : tirage du paquet de
// questions et calcul du bilan. Fonctions PURES : le générateur aléatoire est
// injectable pour les tests, aucune lecture de localStorage ici (l'écran passe
// l'ensemble des ids déjà vus).
import { EXAM_PASS, EXAM_QUESTIONS, EXAM_SIGN_QUESTIONS } from './game'
import { shuffleOptions } from './quiz'

// Les 10 thèmes officiels de l'examen théorique (ids stables). Les libellés
// vivent dans src/i18n/parts/exam.js sous la clé exam_theme_<id>. Une question
// sans `theme` reconnu est regroupée sous THEME_OTHER.
export const THEMES = [
  'circulation',
  'conducteur',
  'route',
  'usagers',
  'notions',
  'secours',
  'vehicule_prendre_quitter',
  'mecanique',
  'securite',
  'environnement',
]
export const THEME_OTHER = 'autre'

// Valeurs de `theme` posées par les ateliers contenu qui ne reprennent pas un
// id officiel. La banque « panneaux » porte 'signalisation' : dans le programme
// de l'ETG, la signalisation relève du thème « La circulation routière ».
export const THEME_ALIASES = {
  signalisation: 'circulation',
}

// Thème officiel d'une question (alias résolus), THEME_OTHER si inconnu ou absent.
export function themeOf(question) {
  const raw = question?.theme
  const theme = THEME_ALIASES[raw] || raw
  return THEMES.includes(theme) ? theme : THEME_OTHER
}

// Fisher-Yates piloté par le générateur fourni (copie).
function shuffleWith(items, rng) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Construit le paquet de l'examen :
//   EXAM_SIGN_QUESTIONS questions « panneaux » (avec image, une seule par
//   panneau quand la banque le permet) + le complément jusqu'à EXAM_QUESTIONS
//   pris dans « code-route » (facile et expert mélangés), en privilégiant les
//   ids absents de `seen`. Options mélangées, ordre global mélangé.
// Si une banque est trop courte, le paquet est simplement plus court.
export function buildExamDeck({ route = [], panneaux = [], seen = new Set(), rng = Math.random }) {
  const taken = new Set()
  const takenImages = new Set()

  // 1) Panneaux : d'abord un panneau par image, puis complément si besoin.
  const wantSigns = Math.min(EXAM_SIGN_QUESTIONS, EXAM_QUESTIONS)
  const signsPool = shuffleWith(panneaux.filter((q) => q && q.image), rng)
  const signs = []
  for (const q of signsPool) {
    if (signs.length >= wantSigns) break
    if (taken.has(q.id) || takenImages.has(q.image)) continue
    signs.push(q)
    taken.add(q.id)
    takenImages.add(q.image)
  }
  for (const q of signsPool) {
    if (signs.length >= wantSigns) break
    if (taken.has(q.id)) continue
    signs.push(q)
    taken.add(q.id)
  }

  // 2) Code de la route : non vues d'abord, le reste ensuite.
  const wantRoute = EXAM_QUESTIONS - signs.length
  const unseen = []
  const rest = []
  for (const q of route) {
    if (!q) continue
    ;(seen.has(q.id) ? rest : unseen).push(q)
  }
  const routePick = []
  for (const q of [...shuffleWith(unseen, rng), ...shuffleWith(rest, rng)]) {
    if (routePick.length >= wantRoute) break
    if (taken.has(q.id)) continue
    routePick.push(q)
    taken.add(q.id)
  }

  // 3) Catégorie explicitée (stats et banque d'erreurs), mélange global,
  //    options mélangées (shuffleOptions suit `optionImages` et `correct`).
  const deck = [
    ...signs.map((q) => ({ ...q, category: q.category || 'panneaux' })),
    ...routePick.map((q) => ({ ...q, category: q.category || 'code-route' })),
  ]
  return shuffleWith(deck, rng).map(shuffleOptions)
}

// Bilan de l'examen à partir des réponses [{ question, chosen }] (chosen =
// index choisi ou null si le temps est écoulé).
// Renvoie { score, total, passed, byTheme, mistakes, results, weakest } :
//   byTheme  = [{ theme, correct, total }] dans l'ordre officiel, 'autre' en dernier
//   mistakes = [{ question, chosen }] au format d'ErrorRecap
//   results  = boolean[] (grille emoji)
//   weakest  = id du thème le plus faible (hors 'autre', et seulement s'il
//              reste des erreurs dessus), sinon null
export function computeExamResult(answers) {
  const results = answers.map(
    ({ question, chosen }) => chosen != null && chosen === question.correct,
  )
  const score = results.filter(Boolean).length
  const total = answers.length

  const mistakes = []
  const buckets = new Map()
  answers.forEach(({ question, chosen }, i) => {
    if (!results[i]) mistakes.push({ question, chosen: chosen ?? null })
    const theme = themeOf(question)
    const bucket = buckets.get(theme) || { theme, correct: 0, total: 0 }
    bucket.total += 1
    if (results[i]) bucket.correct += 1
    buckets.set(theme, bucket)
  })
  const byTheme = [...THEMES, THEME_OTHER]
    .filter((id) => buckets.has(id))
    .map((id) => buckets.get(id))

  let weakest = null
  for (const bucket of byTheme) {
    if (bucket.theme === THEME_OTHER || bucket.correct >= bucket.total) continue
    if (!weakest || bucket.correct / bucket.total < weakest.correct / weakest.total) {
      weakest = bucket
    }
  }

  return {
    score,
    total,
    passed: score >= EXAM_PASS,
    byTheme,
    mistakes,
    results,
    weakest: weakest ? weakest.theme : null,
  }
}
