import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { startCheckout } from '../lib/premium'
import { usePremium } from '../lib/usePremium'
import { sound } from '../lib/sound'

// Page des forfaits "Premium" (overlay). Ouverte via l'événement
// 'quizz:open-paywall' (icône en-tête, encart promo, écran de résultat).
export default function Paywall() {
  const { t } = useI18n()
  const premium = usePremium()
  const [open, setOpen] = useState(false)
  const [soon, setSoon] = useState(false)

  useEffect(() => {
    const onOpen = () => {
      setSoon(false)
      setOpen(true)
    }
    window.addEventListener('quizz:open-paywall', onOpen)
    return () => window.removeEventListener('quizz:open-paywall', onOpen)
  }, [])

  if (!open) return null

  // Lance Stripe Checkout. Si le backend n'est pas encore en ligne, on retombe
  // proprement sur le message « bientôt disponible » (aucune casse).
  async function checkout(plan) {
    sound.select()
    const ok = await startCheckout(plan)
    if (!ok) setSoon(true)
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
    <div className="paywall-overlay" role="dialog" aria-modal="true">
      <div className="paywall-card">
        <button className="paywall-x" onClick={close} aria-label={t('paywall_close')}>
          ✕
        </button>
        <h2 className="paywall-title">👑 {t('paywall_title')}</h2>
        <p className="paywall-sub">{t('paywall_sub')}</p>

        <ul className="paywall-features">
          {features.map((f) => (
            <li key={f}>✓ {f}</li>
          ))}
        </ul>

        {premium ? (
          <p className="paywall-active">{t('premium_active')}</p>
        ) : (
          <>
            <div className="plans">
              <div className="plan">
                <div className="plan-name">{t('plan_monthly_name')}</div>
                <div className="plan-price">
                  {t('plan_monthly_price')}
                  <span className="plan-period">{t('plan_monthly_period')}</span>
                </div>
                <button className="btn btn-secondary plan-cta" onClick={() => checkout('monthly')}>
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
                <button className="btn btn-primary plan-cta" onClick={() => checkout('lifetime')}>
                  {t('paywall_buy')}
                </button>
              </div>
            </div>

            {soon && <p className="paywall-soon">{t('paywall_soon')}</p>}
          </>
        )}
      </div>
    </div>
  )
}
