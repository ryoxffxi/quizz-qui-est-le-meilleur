import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n'
import { usePremium } from '../lib/usePremium'
import { adsConfigured, ADSENSE_CLIENT, ADSENSE_SLOT_RESULT } from '../lib/ads'

function hasConsent() {
  try {
    return localStorage.getItem('quizz_cookie_consent') === 'accepted'
  } catch {
    return false
  }
}

// Bloc affiché sur l'écran de résultat :
// - Premium  -> rien (expérience sans pub)
// - AdSense configuré + consentement -> une vraie publicité
// - sinon -> un encart promo discret invitant au Premium
export default function ResultAd() {
  const { t } = useI18n()
  const premium = usePremium()
  const pushed = useRef(false)
  const showAd = adsConfigured() && hasConsent()

  useEffect(() => {
    if (premium || !showAd || pushed.current) return
    pushed.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      /* AdSense pas encore prêt */
    }
  }, [premium, showAd])

  if (premium) return null

  if (showAd) {
    return (
      <div className="result-ad">
        <span className="result-ad-label">{t('result_ad_label')}</span>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={ADSENSE_SLOT_RESULT}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    )
  }

  // Repli : encart promo "sans pub".
  return (
    <button
      type="button"
      className="noads-promo"
      onClick={() => window.dispatchEvent(new CustomEvent('quizz:open-paywall'))}
    >
      <span className="noads-promo-text">👑 {t('promo_noads_text')}</span>
      <span className="noads-promo-cta">{t('promo_noads_cta')}</span>
    </button>
  )
}
