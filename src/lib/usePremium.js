import { useEffect, useState } from 'react'
import { isPremium } from './premium'

// Hook réactif : suit l'état Premium et se met à jour quand il change.
export function usePremium() {
  const [premium, setPremiumState] = useState(isPremium)
  useEffect(() => {
    const sync = () => setPremiumState(isPremium())
    window.addEventListener('quizz:premium-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('quizz:premium-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return premium
}
