import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Home from './components/Home'
import BankGate, { GateSpinner } from './components/BankGate'
import ScreenBoundary from './components/ScreenBoundary'
import LazyScreen from './components/LazyScreen'
import LanguageSelector from './components/LanguageSelector'
import Footer from './components/Footer'
import CookieConsent from './components/CookieConsent'
import UpdateToast, { Toast } from './components/UpdateToast'
import { usePremium } from './lib/usePremium'
import { PREMIUM_LIVE } from './lib/premium'
import { getTheme, toggleTheme } from './lib/theme'
import { sound } from './lib/sound'
import { useI18n } from './i18n'
import { IconCrown, IconSwatch, IconSoundOn, IconSoundOff } from './components/icons'
import { loadBank } from './content'
import {
  HOME,
  isGameScreen,
  parseLocation,
  pathFor,
  resolveDailyCategory,
  titleFor,
} from './lib/router'
import { getPrefs, setPrefs } from './lib/prefs'
import { preloadScreen } from './lib/screens'
import { useInstallPrompt } from './lib/pwa'
import './styles/app.css'

// Durée d'affichage du message « lien invalide » à l'accueil.
const NOTICE_MS = 4000

// Paramètres d'adresse consommés par la coquille elle-même : anciens liens
// (?jouer=, ?niveau=, ?onglet=) et démarrage PWA (?source=pwa). Les autres
// (premium, session_id, portail, don) sont laissés à premium.js / DonateModal,
// qui les retirent eux-mêmes une fois traités.
const OWN_PARAMS = ['jouer', 'niveau', 'onglet', 'source']

// Événements qui ouvrent une modale (Paywall, Don, pages légales) : les trois
// vivent dans un chunk paresseux monté à la première demande.
const MODAL_EVENTS = ['quizz:open-paywall', 'quizz:open-donate', 'quizz:open-legal']

const HOME_PANNEAUX = Object.freeze({ screen: 'home', tab: 'panneaux' })

function readRoute(lang) {
  return parseLocation(window.location, { lang }) || HOME
}

// Banques à charger pour une route, lancées en parallèle du chunk de l'écran
// (BankGate les redemande ensuite : loadBank est idempotent).
function banksFor(route, dailyCategory) {
  switch (route.screen) {
    case 'solo':
    case 'errors':
    case 'challengeSetup':
      return [route.categoryId]
    case 'invite':
      return [route.invite.c]
    case 'challenge':
      return [route.config.categoryId]
    case 'exam':
      return ['code-route', 'panneaux']
    case 'daily':
      return [dailyCategory]
    default:
      return []
  }
}

// Adresse de départ : anciens liens réécrits vers le contrat, paramètres
// consommés retirés, hash résiduel effacé à l'accueil. Les liens partagés
// (#defi=, #resultat=) sont conservés tels quels, sur /.
function normalizeStartUrl(route) {
  let url
  try {
    url = new URL(window.location.href)
  } catch {
    return
  }
  for (const key of OWN_PARAMS) url.searchParams.delete(key)
  const qs = url.searchParams.toString()
  const search = qs ? `?${qs}` : ''
  let target
  if (route.screen === 'invite' || route.screen === 'result') {
    target = `${url.pathname}${search}${url.hash}`
  } else if (route.screen === 'home') {
    target = `${pathFor(route)}${search}`
  } else {
    target = pathFor(route)
  }
  try {
    window.history.replaceState({ route }, '', target)
  } catch {
    /* adresse refusée (origine opaque) : sans conséquence */
  }
}

function hasModalReturnParams() {
  try {
    return new URLSearchParams(window.location.search).get('don') === 'merci'
  } catch {
    return false
  }
}

// Rejoue l'événement d'ouverture arrivé AVANT que les modales soient montées
// (leurs écouteurs n'existaient pas encore). Placé après <Modals /> dans
// l'arbre : ses effets s'exécutent après les leurs.
function ReplayEvent({ pendingRef }) {
  useEffect(() => {
    const e = pendingRef.current
    if (!e) return
    pendingRef.current = null
    window.dispatchEvent(new CustomEvent(e.type, { detail: e.detail }))
  }, [pendingRef])
  return null
}

// Paywall + Don + pages légales : chunk paresseux monté à la première
// ouverture (ou tout de suite au retour d'un don, /?don=merci).
function LazyModals() {
  const [wanted, setWanted] = useState(hasModalReturnParams)
  const pendingRef = useRef(null)

  useEffect(() => {
    if (wanted) return undefined
    const onOpen = (e) => {
      pendingRef.current = e
      setWanted(true)
    }
    MODAL_EVENTS.forEach((name) => window.addEventListener(name, onOpen))
    return () => MODAL_EVENTS.forEach((name) => window.removeEventListener(name, onOpen))
  }, [wanted])

  if (!wanted) return null
  return (
    <Suspense fallback={null}>
      <LazyScreen name="modals" />
      <ReplayEvent pendingRef={pendingRef} />
    </Suspense>
  )
}

export default function App() {
  const { t, lang } = useI18n()
  const premium = usePremium()
  const install = useInstallPrompt()
  // Route initiale lue dans l'adresse (chemin du contrat, ancien lien ou hash
  // partagé) ; ensuite navigate() et le bouton Retour la font évoluer.
  const [route, setRoute] = useState(() => readRoute(lang))
  const [prefs, setPrefsState] = useState(getPrefs)
  const [muted, setMuted] = useState(() => sound.isMuted())
  const [theme, setThemeState] = useState(getTheme)
  // Message bref quand l'adresse visait un écran impossible (voir router.js).
  const [linkNotice, setLinkNotice] = useState(() => route.notice === 'app_link_unavailable')
  const initialRouteRef = useRef(route)
  const langRef = useRef(lang)

  useEffect(() => {
    langRef.current = lang
  }, [lang])

  // Écrans « en partie » : interface réduite (pas de footer, contrôles limités).
  const inGame = isGameScreen(route.screen)
  const dailyCategory = route.screen === 'daily' ? resolveDailyCategory(route, prefs, lang) : null
  // Change à chaque adresse : remonte la garde d'erreur de l'écran.
  const screenKey = pathFor(route)

  // Navigation : nouvel écran + nouvelle entrée d'historique (ou remplacement).
  const navigate = useCallback((next, { replace = false } = {}) => {
    const path = pathFor(next)
    try {
      if (replace) window.history.replaceState({ route: next }, '', path)
      else window.history.pushState({ route: next }, '', path)
    } catch {
      /* adresse refusée : l'écran change quand même */
    }
    if (!replace) {
      try {
        window.scrollTo(0, 0)
      } catch {
        /* environnement sans défilement */
      }
    }
    setRoute(next)
  }, [])

  // Adresse de départ normalisée, une seule fois (StrictMode : idempotent).
  useEffect(() => {
    normalizeStartUrl(initialRouteRef.current)
  }, [])

  // Retour / Avance du navigateur : on reprend la route mémorisée dans
  // l'entrée d'historique, sinon on relit l'adresse.
  useEffect(() => {
    const onPop = (e) => {
      const next = (e.state && e.state.route) || readRoute(langRef.current)
      setRoute(next)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Titre du document. LanguageProvider (parent) pose app_title dans son
  // propre effet, exécuté APRÈS celui-ci au changement de langue : on écrit en
  // microtâche pour passer derrière lui.
  useEffect(() => {
    const title = titleFor(route, t)
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) document.title = title
    })
    return () => {
      cancelled = true
    }
  }, [route, t])

  // Message « lien invalide » : disparaît seul.
  useEffect(() => {
    if (!linkNotice) return undefined
    const id = setTimeout(() => setLinkNotice(false), NOTICE_MS)
    return () => clearTimeout(id)
  }, [linkNotice])

  // Chunk de l'écran et banques de questions demandés EN PARALLÈLE dès
  // l'entrée sur la route (sinon BankGate attendrait le chunk avant de
  // commencer la banque). Les échecs sont affichés par BankGate/ScreenBoundary.
  useEffect(() => {
    if (route.screen !== 'home') preloadScreen(route.screen).catch(() => {})
    for (const id of banksFor(route, dailyCategory)) loadBank(id).catch(() => {})
  }, [route, dailyCategory])

  function toggleMute() {
    const next = !muted
    setMuted(next)
    sound.setMuted(next)
    if (!next) {
      sound.unlock()
      sound.select()
    }
  }

  // Préférences (onglet, mode, niveau, catégories) : écrites ici, relues par
  // Home via la prop `prefs`. L'onglet fait partie de l'adresse (/ ou
  // /revision/panneaux) : on la suit sans créer d'entrée d'historique.
  function changePrefs(patch) {
    const next = setPrefs(patch)
    setPrefsState(next)
    if (patch && patch.tab && route.screen === 'home' && (route.tab || 'quiz') !== next.tab) {
      navigate(next.tab === 'panneaux' ? HOME_PANNEAUX : HOME, { replace: true })
    }
  }

  function goHome() {
    navigate(HOME)
  }

  function goHomePanneaux() {
    navigate(HOME_PANNEAUX)
  }

  // Depuis l'accueil : Solo lance le quiz ; Défi passe par la saisie du pseudo.
  function start({ categoryId, mode, difficulty, imageFamily }) {
    sound.unlock()
    changePrefs({ lastCategory: categoryId })
    if (mode === 'challenge') {
      navigate({ screen: 'challengeSetup', categoryId, difficulty })
    } else {
      navigate({
        screen: 'solo',
        categoryId,
        difficulty,
        ...(imageFamily ? { imageFamily } : {}),
      })
    }
  }

  function startDaily(categoryId) {
    sound.unlock()
    if (categoryId) changePrefs({ dailyCategory: categoryId })
    navigate({ screen: 'daily', categoryId: categoryId || null })
  }

  function startExam() {
    sound.unlock()
    navigate({ screen: 'exam' })
  }

  function startErrors(categoryId) {
    sound.unlock()
    navigate({ screen: 'errors', categoryId })
  }

  function startFlashcards() {
    sound.unlock()
    navigate({ screen: 'flashcards' })
  }

  // Revanche (accueil « Mes duels », fin de défi) : réglages pré-remplis.
  function startRematch({ categoryId, difficulty, opponent, rounds }) {
    sound.unlock()
    navigate({
      screen: 'challengeSetup',
      categoryId,
      difficulty,
      ...(opponent ? { opponent } : {}),
      ...(rounds ? { rematch: { rounds } } : {}),
    })
  }

  function startChallenge(config) {
    sound.unlock()
    navigate({ screen: 'challenge', config })
  }

  function renderScreen() {
    switch (route.screen) {
      case 'solo':
        return (
          <BankGate categoryId={route.categoryId} onHome={goHome}>
            <LazyScreen
              name="solo"
              categoryId={route.categoryId}
              difficulty={route.difficulty}
              imageFamily={route.imageFamily}
              onExit={goHome}
              onChallenge={() =>
                navigate({
                  screen: 'challengeSetup',
                  categoryId: route.categoryId,
                  difficulty: route.difficulty,
                })
              }
              onReplayErrors={() => navigate({ screen: 'errors', categoryId: route.categoryId })}
            />
          </BankGate>
        )
      case 'errors':
        return (
          <BankGate categoryId={route.categoryId} onHome={goHome}>
            <LazyScreen name="errors" categoryId={route.categoryId} mode="errors" onExit={goHome} />
          </BankGate>
        )
      case 'challengeSetup':
        return (
          <BankGate categoryId={route.categoryId} onHome={goHome}>
            <LazyScreen
              name="challengeSetup"
              categoryId={route.categoryId}
              difficulty={route.difficulty}
              opponent={route.opponent}
              rematch={route.rematch}
              onStart={startChallenge}
              onCancel={goHome}
            />
          </BankGate>
        )
      case 'invite':
        return (
          <BankGate categoryId={route.invite.c} onHome={goHome}>
            <LazyScreen name="invite" invite={route.invite} onStart={startChallenge} onCancel={goHome} />
          </BankGate>
        )
      case 'result':
        return (
          <LazyScreen
            name="result"
            result={route.result}
            onPlay={goHome}
            onJoin={({ invite }) => navigate({ screen: 'invite', invite })}
            onChallenge={({ opponent, rounds } = {}) =>
              navigate({
                screen: 'challengeSetup',
                categoryId: route.result.c,
                difficulty: route.result.d,
                ...(opponent ? { opponent } : {}),
                ...(rounds ? { rematch: { rounds } } : {}),
              })
            }
          />
        )
      case 'challenge':
        return (
          <BankGate categoryId={route.config.categoryId} onHome={goHome}>
            <LazyScreen name="challenge" config={route.config} onExit={goHome} onRematch={startRematch} />
          </BankGate>
        )
      case 'exam':
        return (
          <BankGate categoryId="code-route" onHome={goHome}>
            <BankGate categoryId="panneaux" onHome={goHome}>
              <LazyScreen
                name="exam"
                onExit={goHome}
                onHome={goHome}
                onReplayErrors={(cat = 'code-route') => navigate({ screen: 'errors', categoryId: cat })}
                onReviseTheme={() =>
                  navigate({ screen: 'solo', categoryId: 'code-route', difficulty: 'expert' })
                }
              />
            </BankGate>
          </BankGate>
        )
      case 'daily':
        return (
          <BankGate categoryId={dailyCategory} onHome={goHome}>
            <LazyScreen
              name="daily"
              key={dailyCategory}
              categoryId={dailyCategory}
              onExit={goHome}
              onHome={goHome}
            />
          </BankGate>
        )
      case 'flashcards':
        return <LazyScreen name="flashcards" onExit={goHomePanneaux} />
      default:
        return null
    }
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
            onClick={() => window.dispatchEvent(new CustomEvent('quizz:open-paywall'))}
            aria-label={t('upsell_premium')}
            title={t('upsell_premium')}
          >
            <IconCrown size={18} />
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

      {route.screen === 'home' ? (
        <Home
          prefs={prefs}
          onPrefsChange={changePrefs}
          onStart={start}
          onDaily={startDaily}
          onExam={startExam}
          onErrors={startErrors}
          onFlashcards={startFlashcards}
          onRematch={startRematch}
          onInstall={install}
          initialTab={route.tab}
        />
      ) : (
        /* Tous les autres écrans sont des chunks paresseux : même visuel
           d'attente que BankGate, et une garde locale (Réessayer / Accueil)
           si le chunk ne vient pas. */
        <ScreenBoundary key={screenKey} name={route.screen} onHome={goHome}>
          <Suspense fallback={<GateSpinner text={t('app_loading')} />}>{renderScreen()}</Suspense>
        </ScreenBoundary>
      )}

      {/* Pas de footer PENDANT une partie : l'écran de jeu reste sans
          distraction (les résultats offrent déjà le retour à l'accueil). */}
      {!inGame && <Footer />}
      <CookieConsent />
      <LazyModals />
      <UpdateToast />
      {linkNotice && <Toast tone="warn">{t('app_link_unavailable')}</Toast>}
    </div>
  )
}
