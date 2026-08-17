// Jeu d'icônes SVG maison (24×24, trait 2, currentColor) — remplace les emoji
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

// Pastille « Q » (logo maison, même dessin que le favicon).
export function QMark({ size = 44 }) {
  return (
    <span className="q-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} viewBox="0 0 64 64" fill="none">
        <circle cx="30.5" cy="28.5" r="13" stroke="currentColor" strokeWidth="7" />
        <path
          d="M36.5 35.5 43 42l-3 2.5 7 7"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
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

// Pastille duo pour l'interrupteur d'ambiance (Volt ↔ Crimson) :
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
