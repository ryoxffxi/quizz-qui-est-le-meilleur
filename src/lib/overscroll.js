// Effet « rubber-band » : léger étirement élastique quand on arrive en haut ou
// en bas de la page, puis retour en douceur. Objectif : un ressenti fluide et
// COHÉRENT entre Safari (déjà natif) et Chrome/Android (qui l'a en moins).
//
// - iOS / Safari : on ne fait rien, l'overscroll natif est déjà parfait.
// - Android / autres tactiles : on désactive l'overscroll natif (parfois absent
//   ou incohérent) et on applique notre propre étirement, identique au feeling iOS.

export function initOverscroll() {
  if (typeof window === 'undefined') return

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  if (!isTouch) return

  const ua = navigator.userAgent || ''
  const isIOS =
    /iP(hone|od|ad)/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIOS) return // l'élastique natif de Safari suffit

  const el = document.getElementById('root')
  if (!el) return

  // On gère nous-mêmes l'élastique : on coupe l'overscroll natif (pull-to-refresh
  // et étirement Android), pour éviter un double effet.
  document.documentElement.style.overscrollBehaviorY = 'none'

  const MAX = 90 // amplitude max de l'étirement (px)
  const RESIST = 0.42 // résistance : plus petit = plus dur à étirer

  let startY = 0
  let dir = 0 // 1 = on tire vers le bas (en haut de page), -1 = inverse
  let active = false

  const atTop = () => window.scrollY <= 0
  const atBottom = () =>
    window.scrollY + window.innerHeight >=
    document.documentElement.scrollHeight - 1

  const damp = (d) => Math.sign(d) * Math.min(MAX, Math.abs(d) * RESIST)

  function onStart(e) {
    if (e.touches.length !== 1) return
    startY = e.touches[0].clientY
    dir = 0
    active = false
    el.style.transition = 'none'
  }

  function onMove(e) {
    if (e.touches.length !== 1) return
    const dy = e.touches[0].clientY - startY

    if (!active) {
      if (atTop() && dy > 0) dir = 1
      else if (atBottom() && dy < 0) dir = -1
      else return
      active = true
    }

    // L'utilisateur repart dans le sens du contenu : on rend la main au scroll natif.
    if ((dir === 1 && dy <= 0) || (dir === -1 && dy >= 0)) {
      el.style.transform = ''
      active = false
      return
    }

    e.preventDefault()
    el.style.transform = `translate3d(0, ${damp(dy)}px, 0)`
  }

  function release() {
    if (!active && !el.style.transform) return
    active = false
    dir = 0
    el.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)'
    el.style.transform = 'translate3d(0, 0, 0)'
    const clear = () => {
      el.style.transition = ''
      el.style.transform = ''
      el.removeEventListener('transitionend', clear)
    }
    el.addEventListener('transitionend', clear)
  }

  window.addEventListener('touchstart', onStart, { passive: true })
  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('touchend', release, { passive: true })
  window.addEventListener('touchcancel', release, { passive: true })
}
