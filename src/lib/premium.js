// État "Premium" (sans publicité). Pour l'instant stocké en local : c'est un
// jalon. Le vrai déblocage viendra avec le paiement (Stripe) + comptes, qui
// poseront ce même drapeau de façon vérifiée.
const KEY = 'quizz_premium'

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
