import counts from './counts.json'

// Métadonnées d'affichage de chaque catégorie (id stable, utilisé dans les
// liens de Défi et les résultats partagés — ne JAMAIS le renommer).
//
// `labelKey` = clé i18n du libellé. `frOnly` = visible uniquement en français.
// `bank`     = nom du fichier JSON (sert de clé dans counts.json).
// `load`     = import DYNAMIQUE de la banque : chaque banque est un chunk à
//              part, téléchargé seulement quand on joue cette catégorie.
//              Avant, les 1392 questions partaient dans le bundle principal.
export const CATEGORIES = [
  {
    id: 'culture-generale',
    bank: 'culture-generale',
    labelKey: 'cat_culture',
    emoji: '🧠',
    gradient: ['#6366f1', '#8b5cf6'],
    load: () => import('./culture-generale.json'),
  },
  {
    id: 'manga-anime',
    bank: 'manga-anime',
    labelKey: 'cat_manga',
    emoji: '🍥',
    gradient: ['#ec4899', '#f43f5e'],
    load: () => import('./manga-anime.json'),
  },
  {
    id: 'code-route',
    bank: 'code-route',
    labelKey: 'cat_route',
    emoji: '🚦',
    gradient: ['#f59e0b', '#ef4444'],
    load: () => import('./code-route.json'),
    frOnly: true, // le code de la route est spécifique à la France
  },
  {
    id: 'panneaux',
    bank: 'panneaux-quiz', // l'id et le fichier diffèrent ici (historique)
    labelKey: 'cat_panneaux',
    emoji: '🚸',
    gradient: ['#16a34a', '#0d9488'],
    load: () => import('./panneaux-quiz.json'),
    frOnly: true, // panneaux français (les questions portent une image)
  },
  {
    id: 'cinema-series',
    bank: 'cinema-series',
    labelKey: 'cat_cinema',
    emoji: '🎬',
    gradient: ['#06b6d4', '#3b82f6'],
    load: () => import('./cinema-series.json'),
  },
]

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id)
}

// Catégories visibles selon la langue (masque les catégories frOnly hors FR).
export function getCategories(lang) {
  return lang === 'fr' ? CATEGORIES : CATEGORIES.filter((c) => !c.frOnly)
}

// --- Chargement paresseux des banques ---------------------------------------
// `loaded` : banques prêtes (id -> tableau de questions).
// `pending`: chargements en cours (id -> Promise), pour ne pas lancer deux fois
//            le même import si deux composants le demandent en même temps.
const loaded = new Map()
const pending = new Map()

// La banque est-elle déjà en mémoire ? (les lectures synchrones en dépendent)
export function isBankReady(categoryId) {
  return loaded.has(categoryId)
}

// Charge la banque d'une catégorie. Idempotent : un second appel renvoie la
// même promesse (ou une promesse déjà résolue si la banque est en cache).
export function loadBank(categoryId) {
  if (loaded.has(categoryId)) return Promise.resolve(loaded.get(categoryId))
  if (pending.has(categoryId)) return pending.get(categoryId)

  const category = getCategory(categoryId)
  if (!category) return Promise.reject(new Error(`catégorie inconnue : ${categoryId}`))

  const promise = category
    .load()
    .then((module) => {
      const questions = module.default
      loaded.set(categoryId, questions)
      pending.delete(categoryId)
      return questions
    })
    .catch((error) => {
      // Un échec réseau ne doit pas condamner la catégorie pour la session :
      // on oublie la tentative pour qu'un nouveau clic puisse réessayer.
      pending.delete(categoryId)
      throw error
    })

  pending.set(categoryId, promise)
  return promise
}

// Renvoie les questions d'une catégorie pour la difficulté demandée (brutes).
// ⚠️ Synchrone : la banque doit avoir été chargée avant (voir BankGate, qui
// garde tous les écrans de jeu). Sans ça, renvoie un tableau vide.
export function getQuestions(categoryId, difficulty) {
  const questions = loaded.get(categoryId)
  if (!questions) return []
  return questions.filter((q) => q.difficulty === difficulty)
}

// Nombre de questions d'une catégorie/difficulté, SANS charger la banque :
// lu dans le manifeste counts.json (généré par `npm run counts`).
export function countQuestions(categoryId, difficulty) {
  const category = getCategory(categoryId)
  if (!category) return 0
  return counts[category.bank]?.[difficulty] ?? 0
}

// --- Localisation des champs multilingues { fr, en, es, pt } (repli sur fr) ---
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
