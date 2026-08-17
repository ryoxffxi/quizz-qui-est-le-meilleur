import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { PREMIUM_LIVE } from '../lib/premium'
import { sound } from '../lib/sound'

const PRESETS = [2, 5, 10]

// Modale de DON (discrète, ouverte depuis le footer via 'quizz:open-donate').
// Montants prédéfinis + montant libre ; tant que les paiements réels ne sont
// pas ouverts (PREMIUM_LIVE=false), le CTA affiche « bientôt disponible ».
// Au retour d'un don payé (/?don=merci), la modale s'ouvre en mode remerciement.
// Retour de Stripe après un don payé (/?don=merci) : détecté à l'init.
const returnedFromDonation = () =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('don') === 'merci'

export default function DonateModal() {
  const { t } = useI18n()
  const [open, setOpen] = useState(returnedFromDonation)
  const [amount, setAmount] = useState(5)
  const [custom, setCustom] = useState('')
  const [soon, setSoon] = useState(false)
  const [thanks, setThanks] = useState(returnedFromDonation)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onOpen = () => {
      setSoon(false)
      setThanks(false)
      setOpen(true)
    }
    window.addEventListener('quizz:open-donate', onOpen)
    // Nettoie le paramètre ?don=merci de l'URL (le remerciement est déjà affiché).
    const params = new URLSearchParams(window.location.search)
    if (params.get('don') === 'merci') {
      params.delete('don')
      const qs = params.toString()
      window.history.replaceState(
        null,
        '',
        window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash,
      )
    }
    return () => window.removeEventListener('quizz:open-donate', onOpen)
  }, [])

  if (!open) return null

  const chosen = custom !== '' ? Number(custom) : amount
  const valid = Number.isFinite(chosen) && chosen >= 1 && chosen <= 500

  async function donate() {
    sound.select()
    if (!PREMIUM_LIVE) {
      setSoon(true)
      return
    }
    if (!valid || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount: chosen }),
      })
      const data = await res.json().catch(() => ({}))
      if (data && data.url) {
        window.location.assign(data.url)
        return
      }
      setSoon(true)
    } catch {
      setSoon(true)
    } finally {
      setBusy(false)
    }
  }

  function close() {
    sound.select()
    setOpen(false)
  }

  return (
    <div className="paywall-overlay" role="dialog" aria-modal="true">
      <div className="paywall-card">
        <button className="paywall-x" onClick={close} aria-label={t('paywall_close')}>
          ✕
        </button>

        {thanks ? (
          <>
            <h2 className="paywall-title">💜</h2>
            <p className="paywall-sub donate-thanks">{t('donate_thanks')}</p>
          </>
        ) : (
          <>
            <h2 className="paywall-title">{t('donate_title')}</h2>
            <p className="paywall-sub">{t('donate_sub')}</p>

            <div className="donate-amounts">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`donate-chip ${custom === '' && amount === v ? 'active' : ''}`}
                  onClick={() => {
                    sound.select()
                    setAmount(v)
                    setCustom('')
                  }}
                >
                  {v} €
                </button>
              ))}
              <input
                className="donate-input"
                type="number"
                min="1"
                max="500"
                inputMode="decimal"
                placeholder={t('donate_custom')}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary donate-cta"
              disabled={!valid || busy}
              onClick={donate}
            >
              {t('donate_cta', { n: valid ? chosen : '—' })}
            </button>

            {soon && <p className="paywall-soon">{t('paywall_soon')}</p>}
          </>
        )}
      </div>
    </div>
  )
}
