import { useRef } from 'react'
import { sound } from '../lib/sound'

// Sélecteur segmenté façon iOS : un « pouce » coloré glisse sous l'option active.
// Accessibilité : groupe de boutons radio (role=radiogroup / radio, aria-checked),
// focus « tournant » (seule l'option active est tabulable) et flèches du clavier
// pour changer de valeur ; Début/Fin sautent aux extrémités.
// `label` (texte) ou `labelledBy` (id) nomment le groupe pour les lecteurs d'écran.
export default function Segmented({ options, value, onChange, accent, label, labelledBy }) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )
  const refs = useRef([])

  function select(i, focus) {
    const o = options[i]
    if (!o) return
    if (o.value !== value) {
      sound.select()
      onChange(o.value)
    }
    if (focus && refs.current[i]) refs.current[i].focus()
  }

  function onKeyDown(e, i) {
    const n = options.length
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = n - 1
    if (next === null) return
    e.preventDefault()
    select(next, true)
  }

  return (
    <div
      className="seg"
      role="radiogroup"
      aria-label={label}
      aria-labelledby={labelledBy}
      style={{ '--count': options.length }}
    >
      <div
        className="seg-thumb"
        aria-hidden="true"
        style={{
          transform: `translateX(${index * 100}%)`,
          background: accent || 'var(--accent)',
        }}
      />
      {options.map((o, i) => {
        const checked = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            ref={(el) => {
              refs.current[i] = el
            }}
            className={`seg-opt ${checked ? 'active' : ''}`}
            onClick={() => select(i, false)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
