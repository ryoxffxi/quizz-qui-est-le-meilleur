// Jeu d'icônes SVG maison (24×24, trait 2, currentColor) : remplace les emoji
// pour un rendu identique sur tous les appareils et une vraie identité graphique.
// Chaque icône hérite de la couleur du parent (color / CSS var).

function Svg({ children, size = 20, strokeWidth = 2, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

/* ---- Marque ---- */

// Pastille « Q » (logo maison) : la LETTRE en Space Grotesk, comme sur la
// maquette validée (le tracé géométrique ressemblait trop à une loupe).
export function QMark({ size = 44 }) {
  return (
    <span
      className="q-mark"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.56) }}
      aria-hidden="true"
    >
      Q
    </span>
  )
}

/* ---- Catégories ---- */

export function IconBulb(props) {
  return (
    <Svg {...props}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 3.6 10.8c-.7.5-1.1 1.3-1.1 2.2h-5c0-.9-.4-1.7-1.1-2.2A6 6 0 0 1 12 3z" />
    </Svg>
  )
}

export function IconTorii(props) {
  return (
    <Svg {...props}>
      <path d="M3 5c3-1.5 15-1.5 18 0M5 4.6V8m14-3.4V8M3.5 8h17M7 8v11m10-11v11M5.5 19h13" />
    </Svg>
  )
}

export function IconTrafficLight(props) {
  return (
    <Svg {...props}>
      <rect x="8" y="2" width="8" height="20" rx="3.5" />
      <circle cx="12" cy="6.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17.5" r="1.6" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function IconSignTriangle(props) {
  return (
    <Svg {...props}>
      <path d="M10.3 3.8 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </Svg>
  )
}

export function IconClapper(props) {
  return (
    <Svg {...props}>
      <path d="M20.2 6 3 11l-.5-1.8a2 2 0 0 1 1.4-2.5l14.7-3.9a2 2 0 0 1 2.4 1.4L21.5 6M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8zM7 9.2 9.5 5M12.5 7.7 15 3.5" />
    </Svg>
  )
}

// Icône de catégorie par id de contenu.
const CAT_ICONS = {
  'culture-generale': IconBulb,
  'manga-anime': IconTorii,
  'code-route': IconTrafficLight,
  panneaux: IconSignTriangle,
  'cinema-series': IconClapper,
}

export function CatIcon({ id, ...rest }) {
  const Icon = CAT_ICONS[id] || IconBulb
  return <Icon {...rest} />
}

/* ---- Interface ---- */

export function IconBook(props) {
  return (
    <Svg {...props}>
      <path d="M4 19V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2M4 19h16M12 4v17" />
    </Svg>
  )
}

export function IconBolt(props) {
  return (
    <Svg {...props}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </Svg>
  )
}

export function IconChevronRight(props) {
  return (
    <Svg {...props}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  )
}

export function IconChevronLeft(props) {
  return (
    <Svg {...props}>
      <path d="m15 6-6 6 6 6" />
    </Svg>
  )
}

export function IconChevronDown(props) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}

export function IconLink(props) {
  return (
    <Svg {...props}>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </Svg>
  )
}

export function IconImage(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-4.4-4.4a2 2 0 0 0-2.8 0L4 20" />
    </Svg>
  )
}

export function IconHome(props) {
  return (
    <Svg {...props}>
      <path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2v-9z" />
    </Svg>
  )
}

// Pastille duo pour l'interrupteur d'ambiance (Volt / Crimson) :
// un cercle à moitié plein, façon sélecteur de contraste.
export function IconSwatch(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function IconSoundOn(props) {
  return (
    <Svg {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    </Svg>
  )
}

export function IconSoundOff(props) {
  return (
    <Svg {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="m16 9 5 5m0-5-5 5" />
    </Svg>
  )
}

/* ---- Statuts, actions, moments arcade (remplacent 👑 💜 ⭐ ✕ ✓ …) ---- */

// Couronne : Premium (sans pub).
export function IconCrown(props) {
  return (
    <Svg {...props}>
      <path d="m3 7.5 4.5 4.5L12 4.5l4.5 7.5L21 7.5 19 19H5L3 7.5z" />
    </Svg>
  )
}

// Cœur : soutien / don.
export function IconHeart(props) {
  return (
    <Svg {...props}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </Svg>
  )
}

// Étoile : score, meilleur résultat.
export function IconStar(props) {
  return (
    <Svg {...props}>
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3z" />
    </Svg>
  )
}

// Fermer (croix cerclée) : bouton de fermeture des modales.
export function IconClose(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6m0-6-6 6" />
    </Svg>
  )
}

// Coche : bonne réponse, option cochée, avantage inclus.
export function IconCheck(props) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
  )
}

// Croix simple : mauvaise réponse.
export function IconX(props) {
  return (
    <Svg {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Svg>
  )
}

// Flamme : série de jours joués (streak).
export function IconFlame(props) {
  return (
    <Svg {...props}>
      <path d="M12 2.5c-.6 3-2.4 4.6-4.3 6.6C6 10.9 5 12.6 5 15a7 7 0 0 0 14 0c0-3-1.5-5.2-3-6.7-.5 1.4-1.3 2.3-2.4 2.9C13.3 8.3 12.8 5 12 2.5z" />
      <path d="M9.5 15.5a2.5 2.5 0 0 0 5 0c0-1.3-1-2-1.7-3.2-.5.9-1.3 1.3-2 1.5-.6.5-1.3 1-1.3 1.7z" />
    </Svg>
  )
}

// Trophée : victoire, examen réussi.
export function IconTrophy(props) {
  return (
    <Svg {...props}>
      <path d="M8 21h8M12 17v4M6 3h12v6a6 6 0 0 1-12 0V3z" />
      <path d="M6 5H3v2a4 4 0 0 0 3 3.9M18 5h3v2a4 4 0 0 1-3 3.9" />
    </Svg>
  )
}

// Cible : précision, objectif.
export function IconTarget(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  )
}

// Calendrier : quiz quotidien.
export function IconCalendar(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  )
}

// Rejouer : refaire ses erreurs, nouveau lot.
export function IconRefresh(props) {
  return (
    <Svg {...props}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
    </Svg>
  )
}

// Cartes : flashcards.
export function IconCards(props) {
  return (
    <Svg {...props}>
      <rect x="4" y="6" width="12" height="15" rx="2.5" />
      <path d="M8 3h9.5A2.5 2.5 0 0 1 20 5.5V18" />
    </Svg>
  )
}

// Chronomètre : examen blanc, défi chronométré.
export function IconTimer(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M9 2h6M12 2v3" />
    </Svg>
  )
}

// Partager (flèche sortante).
export function IconShare(props) {
  return (
    <Svg {...props}>
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </Svg>
  )
}

// Installer (flèche vers le socle) : ajout à l'écran d'accueil.
export function IconInstall(props) {
  return (
    <Svg {...props}>
      <path d="M12 3v12m-5-5 5 5 5-5" />
      <path d="M5 21h14" />
    </Svg>
  )
}
