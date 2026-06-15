import cultureGenerale from './culture-generale.json'
import mangaAnime from './manga-anime.json'
import codeRoute from './code-route.json'
import cinemaSeries from './cinema-series.json'

// Métadonnées d'affichage de chaque catégorie (id stable = nom du fichier).
// `labelKey` = clé i18n du libellé. `frOnly` = visible uniquement en français.
export const CATEGORIES = [
  {
    id: 'culture-generale',
    labelKey: 'cat_culture',
    emoji: '🧠',
    gradient: ['#6366f1', '#8b5cf6'],
    questions: cultureGenerale,
  },
  {
    id: 'manga-anime',
    labelKey: 'cat_manga',
    emoji: '🍥',
    gradient: ['#ec4899', '#f43f5e'],
    questions: mangaAnime,
  },
  {
    id: 'code-route',
    labelKey: 'cat_route',
    emoji: '🚦',
    gradient: ['#f59e0b', '#ef4444'],
    questions: codeRoute,
    frOnly: true, // le code de la route est spécifique à la France
  },
  {
    id: 'cinema-series',
    labelKey: 'cat_cinema',
    emoji: '🎬',
    gradient: ['#06b6d4', '#3b82f6'],
    questions: cinemaSeries,
  },
]

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id)
}

// Catégories visibles selon la langue (masque les catégories frOnly hors FR).
export function getCategories(lang) {
  return lang === 'fr' ? CATEGORIES : CATEGORIES.filter((c) => !c.frOnly)
}

// Renvoie les questions d'une catégorie pour la difficulté demandée (brutes).
export function getQuestions(categoryId, difficulty) {
  const category = getCategory(categoryId)
  if (!category) return []
  return category.questions.filter((q) => q.difficulty === difficulty)
}

// Nombre de questions disponibles dans une catégorie pour une difficulté.
export function countQuestions(categoryId, difficulty) {
  return getQuestions(categoryId, difficulty).length
}

// --- Localisation des champs bilingues { fr, en } (avec repli sur fr) ---
function pickText(field, lang) {
  if (field && typeof field === 'object' && !Array.isArray(field)) {
    return field[lang] ?? field.fr ?? field.en ?? ''
  }
  return field // chaîne déjà « plate » (sécurité)
}
function pickArray(field, lang) {
  if (field && !Array.isArray(field)) {
    return field[lang] ?? field.fr ?? field.en ?? []
  }
  return field
}

// Renvoie une question « aplatie » dans la langue voulue (question/options/
// explanation en chaînes simples). `correct` et `id` restent inchangés.
export function localizeQuestion(q, lang) {
  return {
    ...q,
    question: pickText(q.question, lang),
    options: pickArray(q.options, lang),
    explanation: pickText(q.explanation, lang),
  }
}

// Questions d'une catégorie/difficulté déjà localisées.
export function getLocalizedQuestions(categoryId, difficulty, lang) {
  return getQuestions(categoryId, difficulty).map((q) => localizeQuestion(q, lang))
}
