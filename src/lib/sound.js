// Effets sonores courts générés à la volée via la Web Audio API.
// Aucun fichier audio : tout est synthétisé, donc léger et instantané.

let ctx = null
let muted = false

function getCtx() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
  }
  // Les navigateurs suspendent l'audio tant qu'il n'y a pas eu d'interaction.
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// Joue une note simple avec une enveloppe douce (fade in/out).
function tone({ freq, dur = 0.12, type = 'sine', gain = 0.05, when = 0, slideTo }) {
  const c = getCtx()
  if (!c) return
  const t0 = c.currentTime + when
  const osc = c.createOscillator()
  const env = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  env.gain.setValueAtTime(0.0001, t0)
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(env).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.03)
}

export const sound = {
  setMuted(value) {
    muted = value
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
    tone({ freq: 520, dur: 0.07, type: 'triangle', gain: 0.04 })
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
  tick() {
    if (muted) return
    tone({ freq: 420, dur: 0.025, type: 'square', gain: 0.02 })
  },
}
