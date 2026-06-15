import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { LEGAL } from '../content/legal'

// Affiche une page légale (confidentialité ou conditions) en overlay.
// Ouverte via 'quizz:open-legal' avec { detail: 'privacy' | 'terms' }.
export default function LegalModal() {
  const { lang } = useI18n()
  const [doc, setDoc] = useState(null)

  useEffect(() => {
    const onOpen = (e) => setDoc(e.detail === 'terms' ? 'terms' : 'privacy')
    window.addEventListener('quizz:open-legal', onOpen)
    return () => window.removeEventListener('quizz:open-legal', onOpen)
  }, [])

  if (!doc) return null

  const data = (LEGAL[doc][lang] || LEGAL[doc].fr)

  return (
    <div className="legal-overlay" role="dialog" aria-modal="true" onClick={() => setDoc(null)}>
      <div className="legal-card" onClick={(e) => e.stopPropagation()}>
        <button className="legal-x" onClick={() => setDoc(null)} aria-label="✕">
          ✕
        </button>
        <h2 className="legal-title">{data.title}</h2>
        <p className="legal-updated">{data.updated}</p>
        {data.sections.map(([h, p]) => (
          <section key={h} className="legal-section">
            <h3>{h}</h3>
            <p>{p}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
