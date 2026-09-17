// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LanguageProvider } from './i18n'
import { encodeChallenge } from './lib/challengeLink'
import App from './App'

// ---- Dépendances des autres chantiers, isolées ----
vi.mock('./lib/sound', () => ({
  sound: { isMuted: () => false, setMuted: vi.fn(), unlock: vi.fn(), select: vi.fn() },
}))
vi.mock('./lib/analytics', () => ({ track: vi.fn(), loadNonEssential: vi.fn() }))

// Invitation d'installation pilotée par le test.
const pwaState = { install: null }
vi.mock('./lib/pwa', () => ({
  useInstallPrompt: () => pwaState.install,
  useUpdateAvailable: () => false,
  applyUpdate: vi.fn(),
}))

// Banques : jamais chargées ici (les écrans sont des doublures).
vi.mock('./content', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, isBankReady: () => true, loadBank: vi.fn(() => Promise.resolve([])) }
})

// Écrans paresseux : une doublure par nom, qui affiche ses props utiles.
vi.mock('./lib/screens', () => {
  const stubs = {}
  const make = (name) =>
    function Stub(props) {
      return (
        <div data-testid={`screen-${name}`}>
          {name}:{props.categoryId || props.invite?.c || ''}:{props.mode || ''}
        </div>
      )
    }
  return {
    SCREEN_NAMES: [],
    getScreen: (name) => (stubs[name] ??= make(name)),
    preloadScreen: vi.fn(() => Promise.resolve(null)),
    resetScreen: vi.fn(),
  }
})

// Accueil : doublure qui expose le contrat Home <-> App.
vi.mock('./components/Home', () => ({
  default: function HomeStub(props) {
    return (
      <div data-testid="home">
        <span data-testid="home-tab">{props.initialTab || props.prefs.tab}</span>
        <button
          type="button"
          onClick={() =>
            props.onStart({ categoryId: 'culture-generale', mode: 'solo', difficulty: 'facile' })
          }
        >
          start-solo
        </button>
        <button
          type="button"
          onClick={() =>
            props.onStart({ categoryId: 'manga-anime', mode: 'challenge', difficulty: 'expert' })
          }
        >
          start-defi
        </button>
        <button type="button" onClick={() => props.onExam()}>
          start-exam
        </button>
        <button type="button" onClick={() => props.onDaily('manga-anime')}>
          start-daily
        </button>
        <button type="button" onClick={() => props.onErrors('cinema-series')}>
          start-errors
        </button>
        <button type="button" onClick={() => props.onPrefsChange({ tab: 'panneaux' })}>
          tab-panneaux
        </button>
        {props.onInstall && (
          <button type="button" onClick={props.onInstall}>
            install
          </button>
        )}
      </div>
    )
  },
}))

function setUrl(url) {
  window.history.replaceState(null, '', url)
}

function renderApp(lang = 'fr') {
  localStorage.setItem('quizzo_lang', lang)
  return render(
    <LanguageProvider>
      <App />
    </LanguageProvider>,
  )
}

// Laisse passer les microtâches (titre du document, Suspense résolu).
async function settle() {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  localStorage.clear()
  pwaState.install = null
  window.scrollTo = vi.fn()
  setUrl('/')
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('App : route initiale', () => {
  it('rend l’accueil sur / avec le titre de l’app et le pied de page', async () => {
    renderApp('fr')
    await settle()
    expect(screen.getByTestId('home')).toBeTruthy()
    expect(document.querySelector('.site-footer')).not.toBeNull()
    expect(document.title).toBe('Quizz - Qui est le meilleur ?')
    expect(window.location.pathname).toBe('/')
  })

  it('/examen en français : écran examen, sans pied de page, titre dédié', async () => {
    setUrl('/examen')
    renderApp('fr')
    await settle()
    expect(screen.getByTestId('screen-exam')).toBeTruthy()
    expect(screen.queryByTestId('home')).toBeNull()
    expect(document.querySelector('.site-footer')).toBeNull()
    expect(document.title).toBe('Examen blanc · Quizz')
    expect(window.location.pathname).toBe('/examen')
  })

  it('/examen hors français : accueil, message bref, adresse ramenée à /', async () => {
    setUrl('/examen')
    renderApp('en')
    await settle()
    expect(screen.getByTestId('home')).toBeTruthy()
    expect(screen.queryByTestId('screen-exam')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('That link goes nowhere')
    expect(window.location.pathname).toBe('/')
  })

  it('ancien lien /?jouer=…&niveau=… : solo, adresse normalisée', async () => {
    setUrl('/?jouer=manga-anime&niveau=expert')
    renderApp('fr')
    await settle()
    expect(screen.getByTestId('screen-solo').textContent).toBe('solo:manga-anime:')
    expect(window.location.pathname).toBe('/jouer/manga-anime/expert')
    expect(window.location.search).toBe('')
    expect(document.title).toBe('Manga & Animé · Expert · Quizz')
  })

  it('/?onglet=panneaux : accueil onglet Panneaux, adresse /revision/panneaux', async () => {
    setUrl('/?onglet=panneaux')
    renderApp('fr')
    await settle()
    expect(screen.getByTestId('home-tab').textContent).toBe('panneaux')
    expect(window.location.pathname).toBe('/revision/panneaux')
  })

  it('?source=pwa (start_url) est retiré sans effet ; les paramètres Stripe restent', async () => {
    setUrl('/?source=pwa&premium=success&session_id=cs_test_1')
    renderApp('fr')
    await settle()
    expect(window.location.search).toBe('?premium=success&session_id=cs_test_1')
    expect(window.location.pathname).toBe('/')
  })

  it('#defi= ouvre l’invitation et garde le hash', async () => {
    const invite = { p: 'Léa', c: 'cinema-series', d: 'facile', s: 12, n: 2, r: [900, 800] }
    const hash = `#defi=${encodeChallenge(invite)}`
    setUrl(`/${hash}`)
    renderApp('fr')
    await settle()
    expect(screen.getByTestId('screen-invite').textContent).toBe('invite:cinema-series:')
    expect(window.location.hash).toBe(hash)
    expect(document.querySelector('.site-footer')).not.toBeNull()
  })

  it('/quotidien sans catégorie : code de la route en FR, culture générale en EN', async () => {
    setUrl('/quotidien')
    renderApp('fr')
    await settle()
    expect(screen.getByTestId('screen-daily').textContent).toBe('daily:code-route:')
    cleanup()
    setUrl('/quotidien')
    renderApp('en')
    await settle()
    expect(screen.getByTestId('screen-daily').textContent).toBe('daily:culture-generale:')
  })

  it('/erreurs/<cat> monte le solo en mode erreurs', async () => {
    setUrl('/erreurs/culture-generale')
    renderApp('fr')
    await settle()
    expect(screen.getByTestId('screen-errors').textContent).toBe('errors:culture-generale:errors')
    expect(document.title).toBe('Mes erreurs · Culture Générale · Quizz')
  })
})

describe('App : navigation et historique', () => {
  it('lancer un solo : pushState vers /jouer/…, écran et titre', async () => {
    renderApp('fr')
    await settle()
    fireEvent.click(screen.getByText('start-solo'))
    await settle()
    expect(screen.getByTestId('screen-solo')).toBeTruthy()
    expect(window.location.pathname).toBe('/jouer/culture-generale/facile')
    expect(window.history.state.route.screen).toBe('solo')
    expect(document.title).toBe('Culture Générale · Facile · Quizz')
    expect(document.querySelector('.site-footer')).toBeNull()
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('un défi passe par les réglages sur /defi/…', async () => {
    renderApp('fr')
    await settle()
    fireEvent.click(screen.getByText('start-defi'))
    await settle()
    expect(screen.getByTestId('screen-challengeSetup').textContent).toBe('challengeSetup:manga-anime:')
    expect(window.location.pathname).toBe('/defi/manga-anime/expert')
    // Les réglages ne sont pas « en partie » : le pied de page reste.
    expect(document.querySelector('.site-footer')).not.toBeNull()
  })

  it('examen, quotidien, erreurs depuis l’accueil', async () => {
    renderApp('fr')
    await settle()
    fireEvent.click(screen.getByText('start-exam'))
    await settle()
    expect(window.location.pathname).toBe('/examen')
    fireEvent.click(screen.getByTestId('screen-exam')) // rien : l'écran est une doublure
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { route: { screen: 'home' } } }))
    })
    fireEvent.click(screen.getByText('start-daily'))
    await settle()
    expect(window.location.pathname + window.location.search).toBe('/quotidien?cat=manga-anime')
    expect(screen.getByTestId('screen-daily').textContent).toBe('daily:manga-anime:')
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { route: { screen: 'home' } } }))
    })
    fireEvent.click(screen.getByText('start-errors'))
    await settle()
    expect(window.location.pathname).toBe('/erreurs/cinema-series')
  })

  it('Retour du navigateur : la route mémorisée dans l’entrée est reprise', async () => {
    renderApp('fr')
    await settle()
    fireEvent.click(screen.getByText('start-solo'))
    await settle()
    expect(screen.queryByTestId('home')).toBeNull()
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { route: { screen: 'home' } } }))
    })
    await settle()
    expect(screen.getByTestId('home')).toBeTruthy()
    expect(document.title).toBe('Quizz - Qui est le meilleur ?')
  })

  it('Retour sans état mémorisé : l’adresse est relue', async () => {
    renderApp('fr')
    await settle()
    setUrl('/flashcards')
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
    })
    await settle()
    expect(screen.getByTestId('screen-flashcards')).toBeTruthy()
  })

  it('changer d’onglet à l’accueil suit l’adresse sans entrée d’historique', async () => {
    renderApp('fr')
    await settle()
    const before = window.history.length
    fireEvent.click(screen.getByText('tab-panneaux'))
    await settle()
    expect(window.location.pathname).toBe('/revision/panneaux')
    expect(window.history.length).toBe(before)
    expect(JSON.parse(localStorage.getItem('quizz_prefs')).tab).toBe('panneaux')
    expect(document.title).toBe('Panneaux routiers · Quizz')
  })

  it('lancer un solo mémorise la dernière catégorie dans les préférences', async () => {
    renderApp('fr')
    await settle()
    fireEvent.click(screen.getByText('start-solo'))
    await settle()
    expect(JSON.parse(localStorage.getItem('quizz_prefs')).lastCategory).toBe('culture-generale')
  })
})

describe('App : installation PWA et contrôles', () => {
  it('« Installer l’app » n’apparaît que si une invitation est disponible', async () => {
    renderApp('fr')
    await settle()
    expect(screen.queryByText('install')).toBeNull()
    cleanup()
    pwaState.install = vi.fn()
    renderApp('fr')
    await settle()
    fireEvent.click(screen.getByText('install'))
    expect(pwaState.install).toHaveBeenCalled()
  })

  it('le bouton son est le seul contrôle pendant une partie', async () => {
    setUrl('/jouer/culture-generale/facile')
    renderApp('fr')
    await settle()
    expect(document.querySelector('.sound-toggle')).not.toBeNull()
    expect(document.querySelector('.theme-toggle')).toBeNull()
    expect(document.querySelector('.premium-toggle')).toBeNull()
  })
})
