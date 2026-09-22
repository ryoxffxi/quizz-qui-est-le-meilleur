// Routes de l'App (contrat d'URL) : adresses SANS fichier physique dans dist/,
// rendues par le shell React qui lit window.location. Le Worker les sert avec
// index.html en 200 quand les assets répondent 404 ; toute autre adresse
// inconnue reçoit la vraie page 404 (dist/404.html, statut 404).
//
// Les pages statiques (/panneaux/<id>, /quiz/<cat>, /a-propos, ...) ne sont PAS
// listées ici : elles existent en tant que fichiers et sont servies directement.

const CAT = '[a-z0-9-]+'
const LEVEL = '(?:facile|expert)'

const APP_ROUTE = new RegExp(
  '^(?:' +
    '/' +
    `|/jouer/${CAT}/${LEVEL}` +
    `|/defi/${CAT}/${LEVEL}` +
    '|/examen' +
    '|/quotidien' +
    `|/erreurs/${CAT}` +
    '|/revision/panneaux' +
    '|/flashcards' +
    ')/?$',
)

// Vrai si le chemin est une route de l'App (barre oblique finale tolérée).
// Ne valide pas l'existence de la catégorie : c'est le shell qui tranche.
export function isAppRoute(pathname) {
  if (typeof pathname !== 'string' || pathname === '') return false
  return APP_ROUTE.test(pathname)
}

// Vrai si le client attend du HTML (navigation de navigateur, robot d'indexation).
// Un fetch() JavaScript envoie « */* » et ne reçoit donc pas la coquille.
export function acceptsHtml(req) {
  const accept = req.headers.get('accept') || ''
  return accept.toLowerCase().includes('text/html')
}

// En-têtes de durcissement posés sur la coquille index.html servie en 200.
export const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
}
