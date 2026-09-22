// Partage d'un texte et d'un lien : feuille de partage native quand elle a un
// sens (mobile tactile), sinon presse-papiers, avec un dernier repli
// « textarea + execCommand » pour les navigateurs sans API clipboard.

// Appareil tactile : la feuille de partage native n'est utile que là
// (sur ordinateur elle est souvent vide ou absente, la copie vaut mieux).
export function isTouchDevice() {
  if (typeof navigator === 'undefined') return false
  // maxTouchPoints fait foi quand il existe (tous les navigateurs actuels) ;
  // `ontouchstart` n'est qu'un repli pour les anciens moteurs.
  if (typeof navigator.maxTouchPoints === 'number') return navigator.maxTouchPoints > 0
  return typeof window !== 'undefined' && 'ontouchstart' in window
}

// Copie via l'API clipboard, puis via un textarea temporaire. Renvoie true si
// l'une des deux méthodes a réussi.
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* API refusée (pas de geste utilisateur, permission) : on tente le repli */
  }
  try {
    if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return !!ok
  } catch {
    return false
  }
}

// shareOrCopy({ url, text, title }) → 'shared' | 'copied' | 'failed'
// `text` peut déjà contenir `url` (texte pré-rédigé) : dans ce cas la feuille
// native reçoit le texte sans l'URL (sinon elle apparaîtrait deux fois) et le
// presse-papiers reçoit le texte tel quel.
export async function shareOrCopy({ url = '', text = '', title = '' } = {}) {
  if (typeof navigator === 'undefined') return 'failed'
  const textHasUrl = !!url && text.includes(url)
  if (typeof navigator.share === 'function' && isTouchDevice()) {
    const data = { title }
    const nativeText = textHasUrl ? text.replace(url, '').trim() : text
    if (nativeText) data.text = nativeText
    if (url) data.url = url
    try {
      await navigator.share(data)
      return 'shared'
    } catch (err) {
      // Feuille fermée par l'utilisateur : rien à copier à sa place.
      if (err && err.name === 'AbortError') return 'failed'
      /* autre échec : on retombe sur le presse-papiers */
    }
  }
  const clip = textHasUrl ? text : [text, url].filter(Boolean).join('\n')
  if (!clip) return 'failed'
  return (await copyText(clip)) ? 'copied' : 'failed'
}

// Grille d'emoji façon Wordle : 🟩 bonne réponse, 🟥 mauvaise, une ligne
// toutes les `perLine` questions.
export function emojiGrid(results, perLine = 10) {
  const lines = []
  for (let i = 0; i < results.length; i += perLine) {
    lines.push(
      results
        .slice(i, i + perLine)
        .map((ok) => (ok ? '🟩' : '🟥'))
        .join(''),
    )
  }
  return lines.join('\n')
}

// Texte de partage : titre, score (« 7/10 » ou « 3450 »), grille, lien.
// Les parties absentes sont simplement omises.
export function buildShareText({ title, score, total, grid, url } = {}) {
  const lines = []
  if (title) lines.push(title)
  if (score != null) lines.push(total != null ? `${score}/${total}` : String(score))
  if (grid) lines.push(grid)
  if (url) lines.push(url)
  return lines.join('\n')
}
