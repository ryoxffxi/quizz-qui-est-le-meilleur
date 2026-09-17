// Effets sonores courts générés à la volée via la Web Audio API.
// Aucun fichier audio : tout est synthétisé, donc léger et instantané.
// Le mode silencieux est persisté (clé quizz_muted) et relu au chargement.

const MUTE_KEY = 'quizz_muted'

let ctx = null
let master = null // bus maître : compresseur → sortie (évite les pics entre notes)
let muted = readMuted()

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function writeMuted(value) {
  try {
    if (value) localStorage.setItem(MUTE_KEY, '1')
    else localStorage.removeItem(MUTE_KEY)
  } catch {
    /* navigation privée : le réglage ne survivra pas, sans gravité */
  }
}

function getCtx() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
    master = ctx.createDynamicsCompressor()
    master.threshold.value = -18
    master.knee.value = 12
    master.ratio.value = 4
    master.attack.value = 0.003
    master.release.value = 0.12
    master.connect(ctx.destination)
  }
  // Les navigateurs suspendent l'audio tant qu'il n'y a pas eu d'interaction ;
  // iOS passe aussi par un état 'interrupted' (appel, autre app) : on relance
  // dès que le contexte n'est pas en marche.
  if (ctx.state !== 'running' && typeof ctx.resume === 'function') {
    const p = ctx.resume()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  }
  return ctx
}

// Volume maître : les gains historiques (0,02-0,05) étaient à peine audibles
// sur haut-parleurs de téléphone. On les remonte globalement, plafonné pour
// rester agréable au casque.
const VOLUME = 3.2

// Joue une note simple avec une enveloppe douce (fade in/out).
function tone({ freq, dur = 0.12, type = 'sine', gain = 0.05, when = 0, slideTo }) {
  const c = getCtx()
  if (!c) return
  const g = Math.min(gain * VOLUME, 0.3)
  const t0 = c.currentTime + when
  const osc = c.createOscillator()
  const env = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  env.gain.setValueAtTime(0.0001, t0)
  env.gain.exponentialRampToValueAtTime(g, t0 + 0.012)
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(env).connect(master || c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.03)
}

// Léger aléa de hauteur (±4 %) : un clic toujours identique fatigue l'oreille.
function jitter(freq) {
  return freq * (1 + (Math.random() * 2 - 1) * 0.04)
}

export const sound = {
  setMuted(value) {
    muted = !!value
    writeMuted(muted)
  },
  isMuted() {
    return muted
  },
  // À appeler sur un geste utilisateur pour « débloquer » l'audio sur mobile.
  unlock() {
    getCtx()
  },
  select() {
    if (muted) return
    tone({ freq: jitter(520), dur: 0.07, type: 'triangle', gain: 0.04 })
  },
  correct() {
    if (muted) return
    tone({ freq: 660, dur: 0.1, type: 'sine', gain: 0.05 })
    tone({ freq: 880, dur: 0.13, type: 'sine', gain: 0.05, when: 0.09 })
  },
  wrong() {
    if (muted) return
    tone({ freq: 240, dur: 0.22, type: 'sawtooth', gain: 0.05, slideTo: 110 })
  },
  win() {
    if (muted) return
    ;[523, 659, 784, 1047].forEach((freq, i) =>
      tone({ freq, dur: 0.16, type: 'triangle', gain: 0.05, when: i * 0.12 }),
    )
  },
  // Défaite : arpège descendant, dernière note qui s'affaisse.
  lose() {
    if (muted) return
    ;[523, 440, 349].forEach((freq, i) =>
      tone({ freq, dur: 0.16, type: 'triangle', gain: 0.045, when: i * 0.13 }),
    )
    tone({ freq: 262, dur: 0.3, type: 'triangle', gain: 0.045, when: 0.39, slideTo: 196 })
  },
  // Tic de chronomètre : très court, discret.
  tick() {
    if (muted) return
    tone({ freq: 420, dur: 0.02, type: 'square', gain: 0.02 })
  },
}
