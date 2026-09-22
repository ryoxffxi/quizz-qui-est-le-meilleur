import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n'
import { usePremium } from '../lib/usePremium'
import { PREMIUM_LIVE } from '../lib/premium'
import { adsConfigured, ADSENSE_CLIENT, ADSENSE_SLOT_RESULT } from '../lib/ads'
import { IconCrown } from './icons'

// Bloc affiché sur l'écran de résultat :
// - Premium (ou AdSense non configuré) -> rien ;
// - sinon une publicité AdSense (le script vient du <head>, le consentement UE
//   du CMP Google), suivie, quand les paiements sont ouverts (PREMIUM_LIVE),
//   de l'encart « sans pub » qui ouvre le paywall.
export default function ResultAd() {
  const { t } = useI18n()
  const premium = usePremium()
  const pushed = useRef(false)
  const showAd = adsConfigured()

  // Un seul push par montage (StrictMode rejoue l'effet : le ref le neutralise).
  useEffect(() => {
    if (premium || !showAd || pushed.current) return
    pushed.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      /* AdSense pas encore prêt */
    }
  }, [premium, showAd])

  if (premium || !showAd) return null

  return (
    <>
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
      {PREMIUM_LIVE && (
        <button
          type="button"
          className="noads-promo"
          onClick={() => window.dispatchEvent(new CustomEvent('quizz:open-paywall'))}
        >
          <span className="noads-promo-text">
            <IconCrown size={18} />
            {t('promo_noads_text')}
          </span>
          <span className="noads-promo-cta">{t('promo_noads_cta')}</span>
        </button>
      )}
    </>
  )
}
