// @vitest-environment jsdom
// Accueil « tableau de bord » : contrat Home <-> App (prefs / onPrefsChange /
// initialTab), bloc de progression, défi du jour, carte héros enrichie, cartes
// de catégorie, section « Mes duels », préchargement, et lien Cookies du footer.
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import Home from './Home'
import Footer from './Footer'

// Tout ce qui est référencé par une usine vi.mock doit être hissé.
const h = vi.hoisted(() => ({
  lang: 'fr',
  CATS: [
    { id: 'culture-generale', labelKey: 'cat_culture', gradient: ['#8b7cff', '#8b5cf6'] },
    { id: 'manga-anime', labelKey: 'cat_manga', gradient: ['#ff6b9d', '#f43f5e'] },
    { id: 'code-route', labelKey: 'cat_route', gradient: ['#ffb020', '#ef4444'], frOnly: true },
    { id: 'panneaux', labelKey: 'cat_panneaux', gradient: ['#2dd4a7', '#0d9488'], frOnly: true },
    { id: 'cinema-series', labelKey: 'cat_cinema', gradient: ['#4cc2ff', '#3b82f6'] },
  ],
  loadBank: vi.fn(),
  getStats: vi.fn(),
  getStreak: vi.fn(),
  getProgress: vi.fn(),
  getExamReadiness: vi.fn(),
  countErrors: vi.fn(),
  getDuels: vi.fn(),
  getDailyState: vi.fn(),
}))

vi.mock('../i18n', () => ({
  useI18n: () => ({
    lang: h.lang,
    locale: 'fr-FR',
    // t() renvoie la clé, suivie des variables : assertions lisibles.
    t: (key, vars) => (vars ? `${key}:${Object.values(vars).join(',')}` : key),
    tn: (key, n, vars) => `${key}:${n}${vars ? `:${Object.values(vars).join(',')}` : ''}`,
    fmtNumber: (n) => String(n),
    fmtDate: (iso) => `date:${iso}`,
  }),
}))
vi.mock('../lib/sound', () => ({ sound: { select: vi.fn() } }))
vi.mock('../lib/premium', () => ({ PREMIUM_LIVE: false }))
vi.mock('../content', () => ({
  getCategories: (lang) => (lang === 'fr' ? h.CATS : h.CATS.filter((c) => !c.frOnly)),
  getCategory: (id) => h.CATS.find((c) => c.id === id),
  countQuestions: (id, diff) => (diff === 'expert' ? 50 : 100),
  loadBank: h.loadBank,
}))
vi.mock('../lib/stats', () => ({
  getStats: h.getStats,
  getStreak: h.getStreak,
  getProgress: h.getProgress,
  getExamReadiness: h.getExamReadiness,
}))
vi.mock('../lib/errors', () => ({ countErrors: h.countErrors }))
vi.mock('../lib/duels', () => ({ getDuels: h.getDuels }))
vi.mock('../lib/daily', () => ({
  getDailyState: h.getDailyState,
  todayKey: () => '2026-09-07',
}))
vi.mock('./PanneauxRevision', () => ({
  default: ({ onStartQuiz, onFlashcards }) => (
    <div data-testid="panneaux-stub">
      <button
        type="button"
        onClick={() => onStartQuiz({ mode: 'solo', difficulty: 'expert', imageFamily: 'danger' })}
      >
        stub-family
      </button>
      <button type="button" onClick={() => onStartQuiz({ mode: 'challenge', difficulty: 'facile' })}>
        stub-defi
      </button>
      <button type="button" onClick={() => onFlashcards()}>
        stub-flash
      </button>
    </div>
  ),
}))

const ZERO_PROGRESS = {
  seen: 0,
  total: 100,
  answered: 0,
  correct: 0,
  accuracy: null,
  best: 0,
  bestTotal: 0,
}

function mount(props = {}) {
  const { prefs: partial, ...rest } = props
  const cb = {
    onPrefsChange: vi.fn(),
    onStart: vi.fn(),
    onDaily: vi.fn(),
    onExam: vi.fn(),
    onErrors: vi.fn(),
    onFlashcards: vi.fn(),
    onRematch: vi.fn(),
  }
  const prefs = {
    tab: 'quiz',
    mode: 'solo',
    difficulty: 'facile',
    lastCategory: null,
    dailyCategory: null,
    ...partial,
  }
  const utils = render(
    <StrictMode>
      <Home prefs={prefs} onInstall={null} {...cb} {...rest} />
    </StrictMode>,
  )
  return { ...utils, ...cb, prefs }
}

// Chips du défi du jour (les Segmented mode/niveau sont aussi des radios :
// on se limite au groupe nommé par home_daily_cat_label).
const dailyChips = () =>
  within(screen.getByRole('radiogroup', { name: 'home_daily_cat_label' })).getAllByRole('radio')
const chip = (label) => dailyChips().find((b) => b.textContent.includes(label))
// Bouton principal d'une carte de catégorie (par son libellé).
const catButton = (label) => screen.getByText(label, { selector: '.cat-label' }).closest('button')

beforeEach(() => {
  h.lang = 'fr'
  h.loadBank.mockReset().mockImplementation(() => Promise.resolve([]))
  h.getStats.mockReset().mockReturnValue({ total: { answered: 0, correct: 0 } })
  h.getStreak.mockReset().mockReturnValue({ current: 0, best: 0, playedToday: false })
  h.getProgress.mockReset().mockReturnValue(ZERO_PROGRESS)
  h.getExamReadiness.mockReset().mockReturnValue({ exams: 0, avg: null, ready: false })
  h.countErrors.mockReset().mockReturnValue(0)
  h.getDuels.mockReset().mockReturnValue([])
  h.getDailyState.mockReset().mockReturnValue({ date: '2026-09-07', results: {} })
})
afterEach(() => {
  cleanup()
  delete window.googlefc
})

describe('Home : sans aucune donnée', () => {
  it('affiche une accroche à la place de la progression, sans rappel de série', () => {
    mount()
    expect(screen.getByText('home_progress_empty')).toBeTruthy()
    expect(screen.queryByText('home_progress_title')).toBeNull()
    expect(screen.queryByText('home_streak_keep')).toBeNull()
    expect(screen.queryByText('home_install')).toBeNull()
    expect(screen.queryByText('home_duels_title')).toBeNull()
    // Accroche chiffrée : 5 catégories × (100 + 50) questions, via fmtNumber.
    expect(screen.getByText('home_tagline:750,5')).toBeTruthy()
  })

  it('défi du jour : chips par catégorie, défaut FR = code de la route, tout « à jouer »', () => {
    const { onDaily, onPrefsChange } = mount()
    const radios = dailyChips()
    expect(radios).toHaveLength(5)
    // Même ordre que les cartes : le héros (code de la route) d'abord.
    expect(radios[0].textContent).toContain('cat_route')
    expect(chip('cat_route').getAttribute('aria-checked')).toBe('true')
    expect(radios.every((r) => r.textContent.includes('home_daily_todo'))).toBe(true)
    expect(screen.getByText('home_daily_sub:10')).toBeTruthy()
    expect(screen.getByText('date:2026-09-07')).toBeTruthy()

    fireEvent.click(screen.getByText('home_daily_play'))
    expect(onDaily).toHaveBeenCalledWith('code-route')
    expect(onPrefsChange).toHaveBeenCalledWith({ dailyCategory: 'code-route' })
  })

  it('défi du jour : une chip change la catégorie jouée', () => {
    const { onDaily } = mount()
    fireEvent.click(chip('cat_manga'))
    expect(chip('cat_manga').getAttribute('aria-checked')).toBe('true')
    expect(chip('cat_route').getAttribute('aria-checked')).toBe('false')
    fireEvent.click(screen.getByText('home_daily_play'))
    expect(onDaily).toHaveBeenCalledWith('manga-anime')
  })

  it('carte héros : sous-titre examen, « aucun examen encore », bouton examen, pas de lien erreurs', () => {
    const { onExam, onStart } = mount()
    expect(screen.getByText('home_exam_sub:40,35')).toBeTruthy()
    expect(screen.getByText('home_ready_none')).toBeTruthy()
    expect(screen.queryByText(/^home_errors_link/)).toBeNull()
    fireEvent.click(screen.getByText('home_exam_go'))
    expect(onExam).toHaveBeenCalledTimes(1)
    // Le bouton principal du héros lance le solo au niveau courant.
    fireEvent.click(screen.getByText('cat_route', { selector: '.hero-name' }))
    expect(onStart).toHaveBeenCalledWith({ categoryId: 'code-route', mode: 'solo', difficulty: 'facile' })
  })

  it('les deux Segmented sont nommés pour les lecteurs d’écran', () => {
    mount()
    expect(screen.getByRole('radiogroup', { name: 'seg_mode_label' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'seg_diff_label' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'home_daily_cat_label' })).toBeTruthy()
  })
})

describe('Home : réglages (prefs) et navigation', () => {
  it('mode et niveau viennent des préférences et remontent par onPrefsChange', () => {
    const { onPrefsChange } = mount()
    fireEvent.click(screen.getByText('mode_challenge'))
    expect(onPrefsChange).toHaveBeenCalledWith({ mode: 'challenge' })
    fireEvent.click(screen.getByText('diff_expert'))
    expect(onPrefsChange).toHaveBeenCalledWith({ difficulty: 'expert' })
  })

  it('en mode défi, le compteur du héros est plafonné à 8 manches × 5', () => {
    mount({ prefs: { mode: 'challenge' } })
    expect(screen.getByText('QUESTIONS_COUNT:40')).toBeTruthy()
    expect(screen.getByText('help_challenge')).toBeTruthy()
  })

  it('une carte lance la catégorie avec mode et niveau courants, et précharge sa banque', () => {
    const { onStart } = mount({ prefs: { difficulty: 'expert' } })
    const manga = catButton('cat_manga')
    fireEvent.pointerDown(manga)
    expect(h.loadBank).toHaveBeenCalledWith('manga-anime')
    fireEvent.click(manga)
    expect(onStart).toHaveBeenCalledWith({
      categoryId: 'manga-anime',
      mode: 'solo',
      difficulty: 'expert',
    })
  })

  it('un échec de préchargement ne remonte pas', async () => {
    h.loadBank.mockImplementation(() => Promise.reject(new Error('réseau')))
    mount()
    fireEvent.pointerDown(catButton('cat_cinema'))
    await Promise.resolve()
    expect(h.loadBank).toHaveBeenCalledWith('cinema-series')
  })

  it('onglet : initialTab prime au premier rendu, puis un clic passe par onPrefsChange', () => {
    const { onPrefsChange } = mount({ initialTab: 'panneaux', prefs: { tab: 'quiz' } })
    expect(screen.getByTestId('panneaux-stub')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'home_tab_panneaux' }).getAttribute('aria-selected')).toBe('true')

    fireEvent.click(screen.getByRole('tab', { name: 'home_tab_quiz' }))
    expect(onPrefsChange).toHaveBeenCalledWith({ tab: 'quiz' })
    // L'amorce est levée : les préférences (tab 'quiz') reprennent la main.
    expect(screen.queryByTestId('panneaux-stub')).toBeNull()
  })

  it('onglet : prefs.tab ouvre les panneaux et le clic Panneaux remonte la préférence', () => {
    const { onPrefsChange, rerender, prefs } = mount()
    expect(screen.queryByTestId('panneaux-stub')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'home_tab_panneaux' }))
    expect(onPrefsChange).toHaveBeenCalledWith({ tab: 'panneaux' })
    rerender(
      <StrictMode>
        <Home prefs={{ ...prefs, tab: 'panneaux' }} onPrefsChange={onPrefsChange} onStart={vi.fn()} />
      </StrictMode>,
    )
    expect(screen.getByTestId('panneaux-stub')).toBeTruthy()
  })

  it('PanneauxRevision : imageFamily relayé à onStart, flashcards branchées', () => {
    const { onStart, onFlashcards } = mount({ initialTab: 'panneaux' })
    fireEvent.click(screen.getByText('stub-family'))
    expect(onStart).toHaveBeenCalledWith({
      categoryId: 'panneaux',
      mode: 'solo',
      difficulty: 'expert',
      imageFamily: 'danger',
    })
    fireEvent.click(screen.getByText('stub-defi'))
    expect(onStart).toHaveBeenLastCalledWith({
      categoryId: 'panneaux',
      mode: 'challenge',
      difficulty: 'facile',
    })
    fireEvent.click(screen.getByText('stub-flash'))
    expect(onFlashcards).toHaveBeenCalledTimes(1)
  })

  it('hors FR : ni onglets, ni héros, ni panneaux ; défi du jour sur la culture générale', () => {
    h.lang = 'en'
    mount({ initialTab: 'panneaux' })
    expect(screen.queryByRole('tab')).toBeNull()
    expect(screen.queryByTestId('panneaux-stub')).toBeNull()
    expect(screen.queryByText('home_exam_go')).toBeNull()
    expect(screen.queryByText('cat_route')).toBeNull()
    expect(dailyChips()).toHaveLength(3)
    expect(chip('cat_culture').getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText('home_tagline:450,3')).toBeTruthy()
  })

  it('« Installer l’app » n’apparaît qu’avec une fonction', () => {
    const onInstall = vi.fn()
    mount({ onInstall })
    fireEvent.click(screen.getByText('home_install'))
    expect(onInstall).toHaveBeenCalledTimes(1)
  })
})

describe('Home : avec des données', () => {
  const DUEL = {
    seed: 42,
    cat: 'manga-anime',
    diff: 'expert',
    opponent: 'Léa',
    myScores: [1200, 900],
    theirScores: [1000, 1100],
    date: new Date().toISOString(),
    status: 'answered',
  }

  beforeEach(() => {
    h.getStats.mockReturnValue({ total: { answered: 120, correct: 96 } })
    h.getStreak.mockReturnValue({ current: 5, best: 7, playedToday: false })
    h.getProgress.mockImplementation((cat) =>
      cat === 'culture-generale'
        ? { seen: 30, total: 100, answered: 40, correct: 33, accuracy: 82, best: 9, bestTotal: 10 }
        : ZERO_PROGRESS,
    )
    h.countErrors.mockImplementation((cat) => ({ 'culture-generale': 3, 'code-route': 2 })[cat] || 0)
    h.getExamReadiness.mockReturnValue({ exams: 4, avg: 36.5, ready: false })
    h.getDailyState.mockReturnValue({
      date: '2026-09-07',
      results: { 'code-route': { score: 8, grid: '', ts: 1 } },
    })
    h.getDuels.mockReturnValue([DUEL])
  })

  it('progression : série, total, record, rappel et « Reprendre » avec sa jauge', () => {
    const { onStart } = mount({ prefs: { lastCategory: 'culture-generale' } })
    expect(screen.getByText('home_progress_title')).toBeTruthy()
    expect(screen.getByText('streak_days:5')).toBeTruthy()
    expect(screen.getByText('home_correct_total:96')).toBeTruthy()
    expect(screen.getByText('home_streak_best:7')).toBeTruthy()
    expect(screen.getByText('home_streak_keep')).toBeTruthy()

    const resume = screen.getByText('home_resume').closest('button')
    expect(resume.textContent).toContain('home_resume_sub:cat_culture,diff_facile')
    expect(resume.textContent).toContain('home_cover:30')
    fireEvent.pointerDown(resume)
    expect(h.loadBank).toHaveBeenCalledWith('culture-generale')
    fireEvent.click(resume)
    expect(onStart).toHaveBeenCalledWith({
      categoryId: 'culture-generale',
      mode: 'solo',
      difficulty: 'facile',
    })
  })

  it('progression : pas de rappel quand on a déjà joué aujourd’hui, invitation quand la série est à zéro', () => {
    h.getStreak.mockReturnValue({ current: 5, best: 5, playedToday: true })
    const { unmount } = mount()
    expect(screen.queryByText('home_streak_keep')).toBeNull()
    expect(screen.queryByText('home_streak_start')).toBeNull()
    expect(screen.queryByText(/^home_streak_best/)).toBeNull()
    unmount()

    h.getStreak.mockReturnValue({ current: 0, best: 5, playedToday: false })
    mount()
    expect(screen.getByText('home_streak_start')).toBeTruthy()
    expect(screen.getByText('home_streak_best:5')).toBeTruthy()
  })

  it('« Reprendre » est masqué si la dernière catégorie est inconnue ou invisible', () => {
    mount({ prefs: { lastCategory: 'inconnue' } })
    expect(screen.queryByText('home_resume')).toBeNull()
  })

  it('défi du jour déjà joué : score sur la chip et bouton « revoir »', () => {
    const { onDaily } = mount()
    expect(chip('cat_route').textContent).toContain('8/10')
    expect(chip('cat_manga').textContent).toContain('home_daily_todo')
    fireEvent.click(screen.getByText('home_daily_review:8,10'))
    expect(onDaily).toHaveBeenCalledWith('code-route')
  })

  it('héros : moyenne des 3 derniers examens et lien « Mes erreurs »', () => {
    const { onErrors } = mount()
    expect(screen.getByText('home_ready_avg:3:36.5,40')).toBeTruthy()
    expect(document.querySelector('.hero-ready-value.is-good')).toBeNull()
    // Le héros n'a pas de pastille d'erreurs : le lien « Mes erreurs » suffit.
    expect(document.querySelector('.hero-card .cat-chip-errors')).toBeNull()
    fireEvent.click(screen.getByText('home_errors_link:2'))
    expect(onErrors).toHaveBeenCalledWith('code-route')
  })

  it('héros : état vert quand la moyenne atteint le seuil', () => {
    h.getExamReadiness.mockReturnValue({ exams: 1, avg: 38, ready: true })
    mount()
    expect(screen.getByText('home_ready_avg:1:38,40')).toBeTruthy()
    expect(document.querySelector('.hero-ready-value.is-good')).toBeTruthy()
    expect(document.querySelector('.cat-gauge-fill.is-good')).toBeTruthy()
  })

  it('carte de catégorie : couverture, précision, record et pastille d’erreurs', () => {
    const { onErrors, onStart } = mount()
    const card = catButton('cat_culture').closest('.cat-card')
    expect(within(card).getByText('home_cover:30')).toBeTruthy()
    expect(within(card).getByText('home_accuracy:82')).toBeTruthy()
    expect(within(card).getByText('home_record:9,10')).toBeTruthy()
    expect(card.querySelector('.cat-gauge-fill').style.getPropertyValue('--fill')).toBe('0.3')

    fireEvent.click(within(card).getByText('home_errors_chip:3'))
    expect(onErrors).toHaveBeenCalledWith('culture-generale')
    expect(onStart).not.toHaveBeenCalled()

    // Une catégorie jamais jouée n'a aucune métadonnée.
    const manga = catButton('cat_manga').closest('.cat-card')
    expect(manga.querySelector('.cat-meta')).toBeNull()
  })

  it('« Mes duels » : catégorie, adversaire, points, statut et revanche', () => {
    const { onRematch } = mount()
    expect(screen.getByText('home_duels_title')).toBeTruthy()
    const item = document.querySelector('.duel-item')
    expect(item.textContent).toContain('home_duel_vs:Léa')
    expect(item.textContent).toContain('cat_manga')
    expect(item.textContent).toContain('diff_expert')
    expect(item.textContent).toContain('home_duel_points:2100,2100')
    expect(item.textContent).toContain('home_duel_status_answered')
    expect(item.textContent).toContain('defi_rematch')

    fireEvent.click(screen.getByRole('button', { name: 'home_rematch_aria:Léa' }))
    expect(onRematch).toHaveBeenCalledWith({
      categoryId: 'manga-anime',
      difficulty: 'expert',
      opponent: 'Léa',
      rounds: 2,
    })
  })

  it('« Mes duels » : 5 plus récents, adversaire anonyme, catégorie inconnue ignorée', () => {
    h.getDuels.mockReturnValue([
      { ...DUEL, seed: 1, opponent: null, status: 'sent', myScores: [] },
      { ...DUEL, seed: 2, cat: 'disparue' },
      ...[3, 4, 5, 6, 7].map((seed) => ({ ...DUEL, seed })),
    ])
    const { onRematch } = mount()
    const items = document.querySelectorAll('.duel-item')
    expect(items).toHaveLength(5)
    expect(items[0].textContent).toContain('home_duel_vs:home_duel_anon')
    expect(items[0].textContent).toContain('home_duel_status_sent')
    fireEvent.click(within(items[0]).getByRole('button'))
    // Sans manche jouée, la revanche repart sur le nombre de manches par défaut.
    expect(onRematch).toHaveBeenCalledWith({
      categoryId: 'manga-anime',
      difficulty: 'expert',
      opponent: null,
      rounds: 3,
    })
  })
})

describe('Footer : lien Cookies', () => {
  it('rouvre le bandeau maison et le message de consentement Google quand il existe', () => {
    const onOpen = vi.fn()
    window.addEventListener('quizz:open-cookies', onOpen)
    const showRevocationMessage = vi.fn()
    window.googlefc = { callbackQueue: [], showRevocationMessage }
    render(<Footer />)
    fireEvent.click(screen.getByText('cookie_manage'))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(window.googlefc.callbackQueue).toHaveLength(1)
    window.googlefc.callbackQueue[0].CONSENT_DATA_READY()
    expect(showRevocationMessage).toHaveBeenCalledTimes(1)
    window.removeEventListener('quizz:open-cookies', onOpen)
  })

  it('sans CMP Google, le bandeau maison s’ouvre quand même sans erreur', () => {
    const onOpen = vi.fn()
    window.addEventListener('quizz:open-cookies', onOpen)
    render(<Footer />)
    expect(() => fireEvent.click(screen.getByText('cookie_manage'))).not.toThrow()
    expect(onOpen).toHaveBeenCalledTimes(1)
    window.removeEventListener('quizz:open-cookies', onOpen)
  })
})
