// État "Premium" (sans publicité). Source de VÉRITÉ = serveur (entitlement D1),
// identifié par un jeton signé. Le localStorage n'est qu'un CACHE d'affichage :
// sans jeton valide, pas de premium (un cache falsifié est nettoyé au démarrage).
const KEY = 'quizz_premium'
const TOKEN_KEY = 'quizz_token'

export function isPremium() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setPremium(value) {
  try {
    if (value) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent('quizz:premium-changed', { detail: !!value }))
}

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
function setToken(t) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

// Lance Stripe Checkout pour un plan ('monthly' | 'lifetime').
// Renvoie true si la redirection est partie, false si le backend n'est pas en ligne
// (l'appelant affiche alors « bientôt disponible »).
export async function startCheckout(plan) {
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const data = await res.json()
    if (data && data.url) {
      window.location.href = data.url
      return true
    }
  } catch {
    /* backend pas encore en ligne */
  }
  return false
}

// Relit l'entitlement côté serveur (source de vérité) et aligne le cache.
async function syncEntitlement() {
  const token = getToken()
  if (!token) return
  try {
    const res = await fetch('/api/entitlement', {
      headers: { authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setPremium(!!(data && data.premium))
  } catch {
    /* hors-ligne : on garde le cache */
  }
}

// Retour de Stripe Checkout : échange le session_id (payé, vérifié serveur)
// contre un jeton de session, et débloque le premium.
async function confirmCheckout(sessionId) {
  try {
    const res = await fetch(`/api/confirm?session_id=${encodeURIComponent(sessionId)}`)
    const data = await res.json()
    if (data && data.token) setToken(data.token)
    setPremium(!!(data && data.premium))
  } catch {
    /* ignore */
  }
}

// À appeler au démarrage : traite le retour de paiement, sinon revalide le statut.
// Sans jeton valide -> premium retiré (empêche un cache localStorage falsifié).
export async function bootstrapEntitlement() {
  let url
  try {
    url = new URL(window.location.href)
  } catch {
    return
  }
  const status = url.searchParams.get('premium')
  const sid = url.searchParams.get('session_id')
  if (status === 'success' && sid) {
    await confirmCheckout(sid)
  } else if (!getToken()) {
    setPremium(false)
  } else {
    await syncEntitlement()
  }
  if (status || sid) {
    url.searchParams.delete('premium')
    url.searchParams.delete('session_id')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  }
}
