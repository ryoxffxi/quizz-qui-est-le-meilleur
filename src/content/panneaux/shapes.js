// Gabarits SVG des panneaux routiers français (viewBox 0 0 240 240).
// Chaque gabarit renvoie un <svg> complet ; les pictogrammes reçus sont des
// fragments SVG (path/g) exprimés dans le même repère 240×240.
//
// Zones utiles pour dessiner un pictogramme :
//   - triangle danger : x 78→162, y 100→188 (picto noir)
//   - rond interdiction/obligation : x 62→178, y 62→178
//   - carré indication : x 45→195 (picto blanc)

export const RED = '#d0212a' // rouge signalisation
export const BLUE = '#0a60b6' // bleu signalisation
export const YELLOW = '#ffd21f' // jaune route prioritaire
export const INK = '#14181d' // noir pictogramme
export const GREY = '#8f969e' // gris des panneaux de fin
const FONT =
  "-apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif"

const wrap = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${body}</svg>`

// Bande diagonale des panneaux de « fin » (haut-droite → bas-gauche).
const endBand = (color = INK) =>
  `<g transform="rotate(45 120 120)"><rect x="107" y="8" width="26" height="224" rx="4" fill="${color}"/></g>`

// Barre rouge des interdictions « barrées » (haut-gauche → bas-droite).
const slashBand = (angle = -45) =>
  `<g transform="rotate(${angle} 120 120)"><rect x="106" y="18" width="28" height="204" rx="4" fill="${RED}"/></g>`

// ===== Familles principales =====

// Triangle rouge (danger, pointe en haut). Fond blanc, ou jaune pour la
// signalisation temporaire (AK…).
export function danger(picto = '', { fond = '#fff' } = {}) {
  return wrap(
    `<path d="M120 24 L224 204 L16 204 Z" fill="${fond}" stroke="${RED}" stroke-width="22" stroke-linejoin="round"/>${picto}`,
  )
}

// Rond blanc cerclé de rouge (interdiction). `slash` ajoute la barre rouge,
// `cross` les deux barres croisées (arrêt + stationnement).
export function interdiction(
  picto = '',
  { slash = false, cross = false, fill = '#fff' } = {},
) {
  const bars = cross ? slashBand() + slashBand(45) : slash ? slashBand() : ''
  return wrap(
    `<circle cx="120" cy="120" r="97" fill="${fill}" stroke="${RED}" stroke-width="22"/>${picto}${bars}`,
  )
}

// Rond bleu (obligation) — picto blanc.
export function obligation(picto = '') {
  return wrap(
    `<circle cx="120" cy="120" r="106" fill="#fff"/><circle cx="120" cy="120" r="100" fill="${BLUE}"/>${picto}`,
  )
}

// Fin d'obligation : rond bleu + bande rouge.
export function finObligation(picto = '') {
  return wrap(
    `<circle cx="120" cy="120" r="106" fill="#fff"/><circle cx="120" cy="120" r="100" fill="${BLUE}"/>${picto}${endBand(
      RED,
    )}`,
  )
}

// Carré bleu à coins arrondis (indication) — picto blanc.
export function indication(picto = '') {
  return wrap(
    `<rect x="12" y="12" width="216" height="216" rx="22" fill="#fff"/><rect x="20" y="20" width="200" height="200" rx="16" fill="${BLUE}"/>${picto}`,
  )
}

// ===== Panneaux « géométriques » construits ici =====

// AB3a — Cédez le passage (triangle inversé, sans picto).
export function cedez() {
  return wrap(
    `<path d="M120 216 L16 36 L224 36 Z" fill="#fff" stroke="${RED}" stroke-width="22" stroke-linejoin="round"/>`,
  )
}

// AB4 — Stop (octogone rouge, liseré blanc).
export function stop() {
  const pts = []
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 8) * (2 * i + 1)
    pts.push(`${120 + 104 * Math.cos(a)},${120 + 104 * Math.sin(a)}`)
  }
  return wrap(
    `<polygon points="${pts.join(' ')}" fill="${RED}" stroke="#fff" stroke-width="10" stroke-linejoin="round" transform="rotate(22.5 120 120)"/><text x="120" y="142" text-anchor="middle" font-family="${FONT}" font-size="60" font-weight="800" letter-spacing="1" fill="#fff">STOP</text>`,
  )
}

// B1 — Sens interdit (disque rouge, barre blanche).
export function sensInterdit() {
  return wrap(
    `<circle cx="120" cy="120" r="106" fill="#fff"/><circle cx="120" cy="120" r="99" fill="${RED}"/><rect x="48" y="105" width="144" height="30" rx="8" fill="#fff"/>`,
  )
}

// B14 — Limitation de vitesse.
export function vitesse(n) {
  const s = String(n)
  const size = s.length >= 3 ? 84 : 104
  const y = s.length >= 3 ? 150 : 156
  return wrap(
    `<circle cx="120" cy="120" r="97" fill="#fff" stroke="${RED}" stroke-width="22"/><text x="120" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="800" fill="${INK}">${s}</text>`,
  )
}

// B25 — Vitesse minimale obligatoire (rond bleu, chiffre blanc).
export function vitesseMin(n) {
  return wrap(
    `<circle cx="120" cy="120" r="106" fill="#fff"/><circle cx="120" cy="120" r="100" fill="${BLUE}"/><text x="120" y="156" text-anchor="middle" font-family="${FONT}" font-size="104" font-weight="800" fill="#fff">${n}</text>`,
  )
}

// Rond blanc des panneaux de fin (liseré fin sombre).
function finBase(inner = '') {
  return `<circle cx="120" cy="120" r="103" fill="#fff" stroke="${INK}" stroke-width="4"/>${inner}`
}

// B31 — Fin de toutes les interdictions.
export function finTout() {
  return wrap(finBase(endBand()))
}

// B33 — Fin de limitation de vitesse (chiffre gris + bande).
export function finVitesse(n) {
  const s = String(n)
  const size = s.length >= 3 ? 80 : 100
  return wrap(
    finBase(
      `<text x="120" y="154" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="800" fill="${GREY}">${s}</text>${endBand()}`,
    ),
  )
}

// Fin d'interdiction avec pictogramme gris (ex. B34 fin d'interdiction de dépasser).
export function finPicto(pictoGris = '') {
  return wrap(finBase(`${pictoGris}${endBand()}`))
}

// AB6 — Route prioritaire (losange jaune) ; AB7 — fin (bande noire).
export function prioritaire({ fin = false } = {}) {
  return wrap(
    `<g transform="rotate(45 120 120)"><rect x="46" y="46" width="148" height="148" rx="14" fill="#fff" stroke="#c9ced4" stroke-width="2"/><rect x="76" y="76" width="88" height="88" rx="8" fill="${YELLOW}"/></g>${
      fin ? endBand() : ''
    }`,
  )
}

// AB1 — Intersection à priorité à droite (croix en X).
export function ab1() {
  return danger(
    `<path d="M96 108 L144 172 M144 108 L96 172" stroke="${INK}" stroke-width="17" stroke-linecap="round" fill="none" transform="rotate(45 120 140)"/>`,
  )
}

// AB2 — Intersection avec route non prioritaire (trait vertical épais + fin).
export function ab2() {
  return danger(
    `<rect x="111" y="102" width="18" height="86" fill="${INK}"/><rect x="82" y="128" width="76" height="9" fill="${INK}"/>`,
  )
}

// B30 / B51 — Entrée et sortie de zone 30.
export function zone30() {
  return wrap(
    `<rect x="12" y="12" width="216" height="216" rx="18" fill="#fff" stroke="#c9ced4" stroke-width="3"/><circle cx="120" cy="96" r="62" fill="#fff" stroke="${RED}" stroke-width="15"/><text x="120" y="120" text-anchor="middle" font-family="${FONT}" font-size="66" font-weight="800" fill="${INK}">30</text><text x="120" y="205" text-anchor="middle" font-family="${FONT}" font-size="46" font-weight="800" fill="${INK}">ZONE</text>`,
  )
}

export function finZone30() {
  return wrap(
    `<rect x="12" y="12" width="216" height="216" rx="18" fill="#fff" stroke="#c9ced4" stroke-width="3"/><g><circle cx="120" cy="96" r="62" fill="#fff" stroke="${GREY}" stroke-width="15"/><text x="120" y="120" text-anchor="middle" font-family="${FONT}" font-size="66" font-weight="800" fill="${GREY}">30</text><text x="120" y="205" text-anchor="middle" font-family="${FONT}" font-size="46" font-weight="800" fill="${GREY}">ZONE</text><g transform="rotate(45 120 120)"><rect x="110" y="4" width="20" height="232" fill="${INK}"/></g></g>`,
  )
}

// C1 — Parking.
export function parking() {
  return indication(
    `<text x="120" y="172" text-anchor="middle" font-family="${FONT}" font-size="150" font-weight="800" fill="#fff">P</text>`,
  )
}

// C13a — Impasse.
export function impasse() {
  return indication(
    `<rect x="108" y="92" width="24" height="106" fill="#fff"/><rect x="62" y="52" width="116" height="26" rx="4" fill="${RED}"/>`,
  )
}
