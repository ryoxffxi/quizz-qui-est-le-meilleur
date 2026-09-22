// Mise en page des options de réponse, partagée par les quatre écrans de jeu
// (Solo, Défi, Examen, Quotidien). Contrat design (index.css, DESIGN.md) : le
// composant pose la classe `.options.grid` quand les quatre réponses sont
// courtes ; à partir de 900 px elles passent en grille 2 x 2, sans effet sur
// mobile. Les options illustrées (optionImages) ont un texte masqué : la
// grille leur convient aussi.
export const SHORT_OPTION_MAX = 24

// Vrai si toutes les options font au plus `max` caractères (espaces de bord
// ignorés). Liste vide ou absente : faux.
export function hasShortOptions(options, max = SHORT_OPTION_MAX) {
  if (!Array.isArray(options) || options.length === 0) return false
  return options.every((o) => String(o ?? '').trim().length <= max)
}

// Classe à ajouter à `.options` pour une question : 'grid' ou ''.
export function optionsGridClass(question) {
  if (!question) return ''
  const illustrated =
    Array.isArray(question.optionImages) &&
    question.optionImages.length === question.options?.length
  return illustrated || hasShortOptions(question.options) ? 'grid' : ''
}
