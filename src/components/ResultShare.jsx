import { useRef, useState } from 'react'
import { toBlob } from 'html-to-image'
import { getCategory } from '../content'
import { buildResultUrl } from '../lib/challengeLink'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import ShareCard from './ShareCard'

// Partage du résultat : lien (page de conversion qui montre le score + invite
// à jouer/défier) et image PNG (stories).
export default function ResultShare({ resultData }) {
  const { t } = useI18n()
  const cardRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [imgMsg, setImgMsg] = useState('')

  const category = getCategory(resultData.c)

  function copyLink() {
    sound.select()
    const url = buildResultUrl(resultData)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => setCopied(true),
        () => setCopied(false),
      )
    }
  }

  async function shareImage() {
    if (busy || !cardRef.current) return
    sound.select()
    setBusy(true)
    setImgMsg('')
    try {
      const blob = await toBlob(cardRef.current, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: '#0b0f1a',
      })
      if (!blob) throw new Error('capture vide')
      const file = new File([blob], 'ryo-offc.png', { type: 'image/png' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t('share_native_title'),
          text: t('share_native_image_text'),
        })
        setImgMsg('')
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'ryo-offc.png'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        setImgMsg(t('share_downloaded'))
      }
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        setImgMsg(t('share_image_error'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="resultshare">
      <p className="resultshare-title">{t('share_result_title')}</p>
      <div className="resultshare-actions">
        <button type="button" className="btn btn-primary" onClick={copyLink}>
          {copied ? t('share_link_copied') : t('share_copy_link')}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={shareImage}
          disabled={busy}
        >
          {busy ? t('share_generating') : t('share_as_image')}
        </button>
      </div>
      {imgMsg && <p className="resultshare-msg">{imgMsg}</p>}

      {/* Carte hors écran, uniquement pour la capture. */}
      <div className="sharecard-host" aria-hidden="true">
        <ShareCard ref={cardRef} resultData={resultData} category={category} />
      </div>
    </div>
  )
}
