import { useEffect, useState } from 'react'
import Home from './components/Home'
import SoloQuiz from './components/SoloQuiz'
import ChallengeQuiz from './components/ChallengeQuiz'
import ChallengeSetup from './components/ChallengeSetup'
import ChallengeInvite from './components/ChallengeInvite'
import ChallengeResultView from './components/ChallengeResultView'
import LanguageSelector from './components/LanguageSelector'
import Footer from './components/Footer'
import CookieConsent from './components/CookieConsent'
import Paywall from './components/Paywall'
import DonateModal from './components/DonateModal'
import LegalModal from './components/LegalModal'
import { usePremium } from './lib/usePremium'
import { PREMIUM_LIVE } from './lib/premium'
import { getTheme, toggleTheme } from './lib/theme'
import { sound } from './lib/sound'
import { useI18n } from './i18n'
import { IconSwatch, IconSoundOn, IconSoundOff } from './components/icons'
import {
  clearChallengeUrl,
  readChallengeFromUrl,
  readResultFromUrl,
} from './lib/challengeLink'

export default function App() {
  const { t } = useI18n()
  const premium = usePremium()
  // Liens partagés : un lien de DÉFI ouvre l'invitation à jouer les mêmes
  // questions ; un lien de RÉSULTAT ouvre la page de conversion (score + invite
  // à défier / jouer). Sinon, accueil.
  const [route, setRoute] = useState(() => {
    const result = readResultFromUrl()
    if (result) return { screen: 'result', result }
    const invite = readChallengeFromUrl()
    return invite ? { screen: 'invite', invite } : { screen: 'home' }
  })
  const [muted, setMuted] = useState(false)
  const [theme, setThemeState] = useState(getTheme)
  // Écrans « en partie » : interface réduite (pas de footer, contrôles limités).
  const inGame = route.screen === 'solo' || route.screen === 'challenge'

  // Nettoie un éventuel hash résiduel quand on est à l'accueil.
  useEffect(() => {
    if (route.screen === 'home' && window.location.hash) {
      clearChallengeUrl()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleMute() {
    const next = !muted
    setMuted(next)
    sound.setMuted(next)
    if (!next) {
      sound.unlock()
      sound.select()
    }
  }

  // Depuis l'accueil : Solo lance le quiz ; Défi passe par la saisie du pseudo.
  function start({ categoryId, mode, difficulty }) {
    sound.unlock()
    if (mode === 'challenge') {
      setRoute({ screen: 'challengeSetup', categoryId, difficulty })
    } else {
      setRoute({ screen: 'solo', categoryId, difficulty })
    }
  }

  function startChallenge(config) {
    sound.unlock()
    setRoute({ screen: 'challenge', config })
  }

  function goHome() {
    clearChallengeUrl() // retire un éventuel défi du lien
    setRoute({ screen: 'home' })
  }

  return (
    <div className="app">
      <div className="topbar-controls">
        {/* Pendant une partie, seule la coupure du son reste : l'ambiance et
            la langue se règlent à l'accueil (évite le chevauchement mobile).
            Couronne (et bouton Soutenir du footer) masqués tant que les
            paiements réels ne sont pas ouverts : les DEUX réapparaissent
            ensemble quand `go-live-stripe.sh --live` passe PREMIUM_LIVE à true. */}
        {PREMIUM_LIVE && !inGame && !premium && (
          <button
            className="premium-toggle"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('quizz:open-paywall'))
            }
            aria-label={t('upsell_premium')}
            title={t('upsell_premium')}
          >
            👑
          </button>
        )}
        {!inGame && (
          <button
            className="theme-toggle"
            data-theme-name={theme}
            onClick={() => {
              sound.select()
              setThemeState(toggleTheme())
            }}
            aria-label={t('theme_toggle')}
            title={t('theme_toggle')}
          >
            <IconSwatch size={18} />
          </button>
        )}
        {!inGame && <LanguageSelector />}
        <button
          className="sound-toggle"
          onClick={toggleMute}
          aria-label={muted ? t('sound_off') : t('sound_on')}
          title={muted ? t('sound_off') : t('sound_on')}
        >
          {muted ? <IconSoundOff size={18} /> : <IconSoundOn size={18} />}
        </button>
      </div>

      {route.screen === 'home' && <Home onStart={start} />}

      {route.screen === 'solo' && (
        <SoloQuiz
          categoryId={route.categoryId}
          difficulty={route.difficulty}
          onExit={goHome}
          onChallenge={() =>
            setRoute({
              screen: 'challengeSetup',
              categoryId: route.categoryId,
              difficulty: route.difficulty,
            })
          }
        />
      )}

      {route.screen === 'challengeSetup' && (
        <ChallengeSetup
          categoryId={route.categoryId}
          difficulty={route.difficulty}
          onStart={startChallenge}
          onCancel={goHome}
        />
      )}

      {route.screen === 'invite' && (
        <ChallengeInvite
          invite={route.invite}
          onStart={startChallenge}
          onCancel={goHome}
        />
      )}

      {route.screen === 'result' && (
        <ChallengeResultView
          result={route.result}
          onPlay={goHome}
          onChallenge={() =>
            setRoute({
              screen: 'challengeSetup',
              categoryId: route.result.c,
              difficulty: route.result.d,
            })
          }
        />
      )}

      {route.screen === 'challenge' && (
        <ChallengeQuiz config={route.config} onExit={goHome} />
      )}

      {/* Pas de footer PENDANT une partie : l'écran de jeu reste sans
          distraction (les résultats offrent déjà le retour à l'accueil). */}
      {!inGame && <Footer />}
      <CookieConsent />
      <Paywall />
      <DonateModal />
      <LegalModal />
    </div>
  )
}
