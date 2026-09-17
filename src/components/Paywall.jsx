import { useEffect, useId, useState } from 'react'
import { useI18n } from '../i18n'
import { startCheckout, openPortal, PREMIUM_LIVE } from '../lib/premium'
import { usePremium } from '../lib/usePremium'
import { sound } from '../lib/sound'
import Dialog from './Dialog'
import { IconCheck, IconCrown, IconX } from './icons'

// Page des forfaits « Premium » (modale <Dialog>). Ouverte via l'événement
// 'quizz:open-paywall' (icône en-tête, encart promo, écran de résultat).
export default function Paywall() {
  const { t } = useI18n()
  const premium = usePremium()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [soon, setSoon] = useState(false)
  const [portalFail, setPortalFail] = useState(false)
  // Verrou anti double-clic : un seul appel Stripe (Checkout ou portail) à la
  // fois, sinon deux sessions partent pour un seul tap.
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onOpen = () => {
      setSoon(false)
      setPortalFail(false)
      setOpen(true)
    }
    window.addEventListener('quizz:open-paywall', onOpen)
    return () => window.removeEventListener('quizz:open-paywall', onOpen)
  }, [])

  // Lance Stripe Checkout. Tant que les paiements réels ne sont pas ouverts
  // (PREMIUM_LIVE=false : Stripe en mode test, vraies cartes refusées), on
  // affiche « bientôt disponible » : l'offre reste visible, jamais cassée.
  async function checkout(plan) {
    sound.select()
    if (!PREMIUM_LIVE) {
      setSoon(true)
      return
    }
    if (busy) return
    setBusy(true)
    const ok = await startCheckout(plan)
    // Redirection partie : on reste verrouillé jusqu'au déchargement de la page.
    if (!ok) {
      setSoon(true)
      setBusy(false)
    }
  }

  // Portail client Stripe (gérer ou résilier l'abonnement, factures).
  async function manage() {
    sound.select()
    if (busy) return
    setBusy(true)
    setPortalFail(false)
    const ok = await openPortal()
    if (!ok) {
      setPortalFail(true)
      setBusy(false)
    }
  }

  function close() {
    sound.select()
    setOpen(false)
  }

  const features = [
    t('paywall_feature_noads'),
    t('paywall_feature_all'),
    t('paywall_feature_support'),
  ]

  return (
    <Dialog open={open} onClose={close} labelledBy={titleId} className="modal-paywall">
      <button type="button" className="modal-x" onClick={close} aria-label={t('close')}>
        <IconX size={18} />
      </button>
      <h2 id={titleId} className="paywall-title">
        <IconCrown className="paywall-crown" size={26} />
        <span>{t('paywall_title')}</span>
      </h2>
      <p className="paywall-sub">{t('paywall_sub')}</p>

      <ul className="paywall-features">
        {features.map((f) => (
          <li key={f}>
            <IconCheck className="paywall-check" size={18} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {premium ? (
        <>
          <p className="paywall-active">{t('premium_active')}</p>
          <button
            type="button"
            className="btn btn-secondary paywall-manage"
            disabled={busy}
            onClick={manage}
          >
            {busy ? t('paywall_loading') : t('paywall_manage')}
          </button>
          {portalFail && <p className="paywall-soon">{t('paywall_portal_fail')}</p>}
        </>
      ) : (
        <>
          <div className="plans">
            <div className="plan">
              <div className="plan-name">{t('plan_monthly_name')}</div>
              <div className="plan-price">
                {t('plan_monthly_price')}
                <span className="plan-period">{t('plan_monthly_period')}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary plan-cta"
                disabled={busy}
                onClick={() => checkout('monthly')}
              >
                {t('paywall_subscribe')}
              </button>
            </div>

            <div className="plan plan-best">
              <div className="plan-badge">{t('plan_lifetime_badge')}</div>
              <div className="plan-name">{t('plan_lifetime_name')}</div>
              <div className="plan-price">
                {t('plan_lifetime_price')}
                <span className="plan-period">{t('plan_lifetime_period')}</span>
              </div>
              <button
                type="button"
                className="btn btn-primary plan-cta"
                disabled={busy}
                onClick={() => checkout('lifetime')}
              >
                {busy ? t('paywall_loading') : t('paywall_buy')}
              </button>
            </div>
          </div>

          {soon && <p className="paywall-soon">{t('paywall_soon')}</p>}
        </>
      )}
    </Dialog>
  )
}
