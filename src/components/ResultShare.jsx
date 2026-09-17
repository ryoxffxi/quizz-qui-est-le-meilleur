import { useEffect, useRef, useState } from 'react'
import { getCategory } from '../content'
import { buildResultUrl } from '../lib/challengeLink'
import { buildShareText, shareOrCopy } from '../lib/share'
import { track } from '../lib/analytics'
import { sound } from '../lib/sound'
import { useI18n } from '../i18n'
import ShareCard from './ShareCard'
import '../styles/defi.css'

const STATUS_MS = 2000 // durée d'affichage de « Copié » / « téléchargée »
const REVOKE_MS = 10000 // l'URL blob du téléchargement survit au clic (Safari)
const CARD_BG = '#0a0d16'
const CARD_W = 1080
const CARD_H = 1920

// CSS des polices intégrées, calculé UNE fois par page : html-to-image le
// recalcule sinon à chaque capture, et c'est l'étape la plus lente.
let fontCssPromise = null
function fontEmbedCss(lib, node) {
  if (!fontCssPromise) {
    fontCssPromise = lib.getFontEmbedCSS(node).catch(() => {
      fontCssPromise = null
      return '' // polices de repli du système : la carte reste lisible
    })
  }
  return fontCssPromise
}

// PNG de la carte (chunk html-to-image chargé à la demande, jamais à l'accueil).
async function renderCard(node) {
  const lib = await import('html-to-image')
  const fontEmbedCSS = await fontEmbedCss(lib, node)
  return lib.toBlob(node, {
    width: CARD_W,
    height: CARD_H,
    pixelRatio: 1,
    backgroundColor: CARD_BG,
    fontEmbedCSS,
  })
}

// Exécute `fn` quand le navigateur souffle (repli : petit délai). Renvoie
// l'annulation.
function whenIdle(fn) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(fn, { timeout: 1500 })
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(fn, 300)
  return () => clearTimeout(id)
}

// Téléchargement d'un blob. L'URL est révoquée plus tard : la révoquer tout de
// suite fait échouer le téléchargement sur certains navigateurs. Ce délai ne
// touche aucun état React, il peut survivre au démontage sans risque.
function download(blob, fileName) {
  try {
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = fileName
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), REVOKE_MS)
    return true
  } catch {
    return false
  }
}

// Partage du résultat : UN bouton, qui envoie l'image ET le texte (avec le
// lien de la page de conversion) par la feuille native quand elle accepte les
// fichiers ; sinon texte + lien (feuille sans fichier, ou presse-papiers) et
// image téléchargée. La carte est pré-générée au montage, hors du chemin
// critique, pour que le geste de partage reste immédiat (iOS exige que
// navigator.share suive de près le tap).
//
// resultData : voir ShareCard (solo-like { solo:1, c, d, l, sc, tot, mode?, grid? }
// ou duel { c, d, l, n, p1, r1, p2, r2, s? }). title / sub : intitulés du bloc
// (par défaut « Partager ton résultat »).
export default function ResultShare({ resultData, title, sub }) {
  const { t } = useI18n()
  const cardRef = useRef(null)
  const blobRef = useRef(null) // PNG pré-généré (null tant qu'il n'est pas prêt)
  const pendingRef = useRef(null) // génération en cours (promesse)
  const [status, setStatus] = useState('') // '' | 'shared' | 'copied' | 'downloaded' | 'failed'
  const [busy, setBusy] = useState(false)

  const category = getCategory(resultData.c)
  const dataKey = JSON.stringify(resultData)

  // Pré-génération au montage (et si le résultat change).
  useEffect(() => {
    let cancelled = false
    blobRef.current = null
    pendingRef.current = null
    const cancelIdle = whenIdle(() => {
      if (cancelled || !cardRef.current) return
      const job = renderCard(cardRef.current)
        .then((blob) => {
          if (!cancelled) blobRef.current = blob
          return blob
        })
        .catch(() => null)
      pendingRef.current = job
    })
    return () => {
      cancelled = true
      cancelIdle()
    }
  }, [dataKey])

  // Les messages d'état s'effacent d'eux-mêmes.
  useEffect(() => {
    if (!status) return undefined
    const id = setTimeout(() => setStatus(''), STATUS_MS)
    return () => clearTimeout(id)
  }, [status])

  if (!category) return null

  const url = buildResultUrl(resultData)
  const catName = t(category.labelKey)
  const score = resultData.solo ? resultData.sc : resultData.r1.reduce((a, b) => a + b, 0)

  // Texte pré-rédigé selon le type de résultat.
  function shareText() {
    if (resultData.solo) {
      if (resultData.mode === 'defi') {
        return t('defi_share_points_text', { score: resultData.sc, cat: catName })
      }
      return t('defi_share_solo_text', {
        cat: catName,
        score: resultData.sc,
        total: resultData.tot,
      })
    }
    return t('defi_result_text', {
      p1: resultData.p1,
      s1: score,
      p2: resultData.p2,
      s2: resultData.r2.reduce((a, b) => a + b, 0),
      cat: catName,
    })
  }

  async function share() {
    if (busy) return
    sound.select()
    setBusy(true)
    const text = buildShareText({ title: shareText(), grid: resultData.grid, url })
    const fileName = `quizz-${resultData.c}-${score}.png`
    let outcome = 'failed'
    try {
      let blob = blobRef.current
      if (!blob && pendingRef.current) blob = await pendingRef.current
      if (!blob && cardRef.current) blob = await renderCard(cardRef.current).catch(() => null)
      blobRef.current = blob

      // 1. Feuille native avec l'image (mobile moderne).
      if (blob && typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
        const file = new File([blob], fileName, { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: t('app_title'), text })
            outcome = 'shared'
          } catch (err) {
            if (err && err.name === 'AbortError') outcome = 'aborted'
            /* autre échec : replis ci-dessous */
          }
        }
      }
      // 2. Texte + lien (feuille sans fichier, sinon presse-papiers), image
      //    téléchargée quand elle n'a pas pu partir avec le texte.
      if (outcome === 'failed') {
        const r = await shareOrCopy({ url, text, title: t('app_title') })
        if (r === 'shared') outcome = 'shared'
        else if (r === 'copied') outcome = blob && download(blob, fileName) ? 'downloaded' : 'copied'
        else if (blob && download(blob, fileName)) outcome = 'downloaded'
      }
    } finally {
      setBusy(false)
    }
    if (outcome === 'shared' || outcome === 'copied' || outcome === 'downloaded') {
      track('share', resultData.mode || (resultData.solo ? 'solo' : 'duel'))
    }
    setStatus(outcome === 'aborted' ? '' : outcome)
  }

  const message =
    status === 'downloaded'
      ? t('defi_share_downloaded')
      : status === 'failed'
        ? t('defi_share_failed')
        : ''

  return (
    <div className="resultshare">
      <p className="resultshare-title">{title || t('share_result_title')}</p>
      {sub && <p className="resultshare-sub">{sub}</p>}

      {/* Miniature = la carte elle-même, réduite (c'est ce nœud qui est capturé). */}
      <div className="sharecard-thumb" aria-hidden="true">
        <div className="sharecard-scale">
          <ShareCard ref={cardRef} resultData={resultData} category={category} />
        </div>
      </div>

      <div className="resultshare-actions">
        <button type="button" className="btn btn-primary" onClick={share} disabled={busy}>
          {busy ? t('share_generating') : status === 'copied' ? t('copied') : t('defi_share')}
        </button>
      </div>
      {message && (
        <p className={`share-status ${status === 'failed' ? 'bad' : ''}`} role="status">
          {message}
        </p>
      )}
    </div>
  )
}
