import { useEffect, useId, useState } from 'react'
import { useI18n } from '../i18n'
import { LEGAL } from '../content/legal'
import Dialog from './Dialog'
import { IconX } from './icons'

// Date ISO (AAAA-MM-JJ) -> date longue dans la langue de l'interface
// (« 15 juin 2026 », « June 15, 2026 »…). Repli sur l'ISO si Intl échoue.
function formatLegalDate(iso, lang) {
  try {
    // Midi local : aucun décalage de fuseau ne peut faire reculer le jour.
    const date = new Date(`${iso}T12:00:00`)
    if (Number.isNaN(date.getTime())) return iso
    return new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(date)
  } catch {
    return iso
  }
}

// Affiche une page légale (confidentialité ou conditions) dans une modale.
// Ouverte via 'quizz:open-legal' avec { detail: 'privacy' | 'terms' }.
export default function LegalModal() {
  const { lang, t } = useI18n()
  const titleId = useId()
  const [doc, setDoc] = useState(null)

  useEffect(() => {
    const onOpen = (e) => setDoc(e.detail === 'terms' ? 'terms' : 'privacy')
    window.addEventListener('quizz:open-legal', onOpen)
    return () => window.removeEventListener('quizz:open-legal', onOpen)
  }, [])

  const data = doc ? LEGAL[doc][lang] || LEGAL[doc].fr : null
  // `updated` porte la date ISO (seule, ou dans une phrase) : on la reformate
  // dans la langue courante ; sans date reconnaissable, texte tel quel.
  const iso = data ? (String(data.updated).match(/\d{4}-\d{2}-\d{2}/) || [])[0] : null
  const updatedText = iso
    ? t('legal_updated', { date: formatLegalDate(iso, lang) })
    : data && data.updated

  function close() {
    setDoc(null)
  }

  return (
    <Dialog open={!!doc} onClose={close} labelledBy={titleId} className="modal-legal">
      {data && (
        <>
          <button type="button" className="modal-x" onClick={close} aria-label={t('close')}>
            <IconX size={18} />
          </button>
          <h2 id={titleId} className="legal-title">
            {data.title}
          </h2>
          <p className="legal-updated">{updatedText}</p>
          {data.sections.map(([h, p]) => (
            <section key={h} className="legal-section">
              <h3>{h}</h3>
              <p>{p}</p>
            </section>
          ))}
        </>
      )}
    </Dialog>
  )
}
