// Deux ambiances au choix de l'utilisateur (décision produit 2026-08-17) :
// 'volt' (lime électrique, défaut) et 'crimson' (rouge arcade).
// Le choix est persisté et appliqué AVANT le premier rendu par un script
// inline dans index.html (évite le flash) ; ce module gère le reste.
const KEY = 'quizz_theme'

export const THEMES = ['volt', 'crimson']

export function getTheme() {
  try {
    const t = localStorage.getItem(KEY)
    return THEMES.includes(t) ? t : 'volt'
  } catch {
    return 'volt'
  }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  // Couleur de la barre système (PWA / navigateur mobile).
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = '#0a0d16'
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* navigation privée : le choix ne survivra pas, sans gravité */
  }
  applyTheme(theme)
}

export function toggleTheme() {
  const next = getTheme() === 'volt' ? 'crimson' : 'volt'
  setTheme(next)
  return next
}
