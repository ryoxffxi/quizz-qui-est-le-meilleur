import { sound } from '../lib/sound'

// Sélecteur segmenté façon iOS : un « pouce » coloré glisse sous l'option active.
export default function Segmented({ options, value, onChange, accent }) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  )

  return (
    <div className="seg" style={{ '--count': options.length }}>
      <div
        className="seg-thumb"
        style={{
          transform: `translateX(${index * 100}%)`,
          background: accent || 'var(--accent)',
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`seg-opt ${o.value === value ? 'active' : ''}`}
          onClick={() => {
            if (o.value !== value) {
              sound.select()
              onChange(o.value)
            }
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
