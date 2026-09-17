// @vitest-environment jsdom
// Examen blanc : règles, réponse en deux taps, résultat sur la nouvelle API
// ResultHero (compteur + pastille de verdict), « Réviser ce thème » seulement
// quand le shell fournit onReviseTheme, options illustrées décoratives.
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

// ---- Banques de test : 3 questions code-route (thème posé), 1 panneau ----
const ROUTE = [
  {
    id: 'r1',
    difficulty: 'facile',
    theme: 'circulation',
    question: 'Q r1',
    options: ['A', 'B', 'C', 'D'],
    correct: 0,
    explanation: 'Expl r1',
  },
  {
    id: 'r2',
    difficulty: 'expert',
    theme: 'conducteur',
    question: 'Q r2',
    options: ['Une réponse vraiment très longue ici', 'B', 'C', 'D'],
    correct: 1,
    explanation: 'Expl r2',
  },
  {
    id: 'r3',
    difficulty: 'facile',
    question: 'Q r3',
    options: ['A', 'B', 'C', 'D'],
    correct: 2,
    explanation: 'Expl r3',
  },
]
const PANNEAUX = [
  {
    id: 'p1',
    difficulty: 'facile',
    theme: 'signalisation',
    question: 'Q p1',
    options: ['Stop', 'Céder', 'Interdit', 'Danger'],
    correct: 0,
    explanation: 'Expl p1',
    image: 'stop',
    optionImages: ['stop', 'ceder', 'sens-interdit', 'danger'],
  },
]
const ALL = [...ROUTE, ...PANNEAUX]

// ---- Dépendances des autres chantiers, isolées ----
vi.mock('../i18n', () => ({
  useI18n: () => ({
    lang: 'fr',
    t: (key, vars) => (vars ? `${key}:${Object.values(vars).join(',')}` : key),
  }),
}))
vi.mock('../content', () => ({
  getCategory: (id) => ({ id, labelKey: `cat_${id}`, gradient: ['#000', '#111'] }),
  getLocalizedQuestions: (cat, diff) =>
    (cat === 'panneaux' ? PANNEAUX : ROUTE).filter((q) => q.difficulty === diff),
  countQuestions: () => 3,
}))
vi.mock('../lib/quiz', () => ({ shuffleOptions: (q) => q }))
vi.mock('../lib/share', () => ({
  emojiGrid: (results) => results.map((ok) => (ok ? 'V' : 'X')).join(''),
}))
vi.mock('../lib/analytics', () => ({ track: vi.fn() }))
vi.mock('../lib/sound', () => ({
  sound: {
    select: vi.fn(),
    correct: vi.fn(),
    wrong: vi.fn(),
    win: vi.fn(),
    lose: vi.fn(),
    tick: vi.fn(),
    unlock: vi.fn(),
  },
}))
vi.mock('./SignImage', () => ({
  default: ({ id, className, alt }) => (
    <span className={className} data-sign={id} data-alt={alt === undefined ? 'auto' : alt} />
  ),
}))
vi.mock('./ResultShare', () => ({
  default: ({ resultData }) => <div data-testid="share" data-mode={resultData.mode} />,
}))
vi.mock('./ResultAd', () => ({ default: () => null }))
vi.mock('./icons', () => ({ CatIcon: () => null }))

import ExamQuiz from './ExamQuiz'
import { track } from '../lib/analytics'
import { sound } from '../lib/sound'
import { countErrors } from '../lib/errors'

function renderExam(props = {}) {
  const onExit = vi.fn()
  const onHome = vi.fn()
  const utils = render(
    <StrictMode>
      <ExamQuiz onExit={onExit} onHome={onHome} {...props} />
    </StrictMode>,
  )
  return { ...utils, onExit, onHome }
}

const current = (container) =>
  ALL.find((q) => q.question === container.querySelector('.quiz-question').textContent)
const options = (container) => [...container.querySelectorAll('.option')]

// Deux taps sur la même option : choix puis validation.
function answer(container, correct) {
  const q = current(container)
  const idx = correct ? q.correct : (q.correct + 1) % q.options.length
  fireEvent.click(options(container)[idx])
  fireEvent.click(options(container)[idx])
  return q
}

// Joue tout l'examen ; `wrongIds` = questions à rater.
function play(container, wrongIds = []) {
  fireEvent.click(screen.getByText('exam_begin'))
  for (let i = 0; i < ALL.length; i++) {
    const q = current(container)
    answer(container, !wrongIds.includes(q.id))
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  })
})
afterEach(() => {
  cleanup()
  delete window.matchMedia
})

describe('ExamQuiz', () => {
  it('règles, puis premier tap choisit et second tap valide ; exam_start tracé une fois', () => {
    const { container } = renderExam()
    expect(screen.getByText('exam_rule_questions:4,1')).toBeTruthy()
    fireEvent.click(screen.getByText('exam_begin'))
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('exam_start')
    expect(screen.getByText('exam_counter:1,4')).toBeTruthy()
    const q = current(container)
    fireEvent.click(options(container)[q.correct])
    expect(options(container)[q.correct].getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('exam_counter:1,4')).toBeTruthy() // pas encore validé
    fireEvent.click(options(container)[q.correct])
    expect(screen.getByText('exam_counter:2,4')).toBeTruthy()
  })

  it('options illustrées décoratives (alt vide, nom en aria-label) et grille pour les options courtes', () => {
    const { container } = renderExam()
    fireEvent.click(screen.getByText('exam_begin'))
    for (let i = 0; i < ALL.length; i++) {
      const q = current(container)
      const opts = container.querySelector('.options')
      if (q.id === 'p1') {
        expect(opts.className).toContain('options-visual')
        expect(opts.className).toContain('grid')
        const first = options(container)[0]
        expect(first.getAttribute('aria-label')).toBe('Stop')
        expect(first.querySelector('.option-sign').getAttribute('data-alt')).toBe('')
        expect(container.querySelector('.quiz-sign').getAttribute('data-alt')).toBe('auto')
      } else if (q.id === 'r2') {
        expect(opts.className).not.toContain('grid')
      } else {
        expect(opts.className).toContain('grid')
      }
      answer(container, true)
    }
  })

  it('résultat : compteur et pastille de verdict (nouvelle API ResultHero), sans « Réviser ce thème » par défaut', () => {
    const { container } = renderExam()
    play(container, ['r1'])
    expect(track).toHaveBeenCalledWith('exam_end', 'ko')
    expect(sound.lose).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.hero-score').getAttribute('aria-label')).toBe('3/4')
    const verdict = container.querySelector('.hero-verdict')
    expect(verdict.className).toContain('bad')
    expect(verdict.textContent).toBe('exam_failed')
    expect(screen.getByText(/^exam_threshold:35,4 exam_missed_by:32$/)).toBeTruthy()
    // Thème le plus faible mis en avant, mais pas de bouton sans onReviseTheme.
    expect(screen.getByText('exam_theme_weak')).toBeTruthy()
    expect(screen.queryByText('exam_revise_theme')).toBeNull()
    expect(screen.getByTestId('share').getAttribute('data-mode')).toBe('examen')
    expect(countErrors('code-route')).toBe(1)
    // Sans onReplayErrors : pas de bouton « Rejouer mes erreurs ».
    expect(screen.queryByText(/^exam_replay_errors/)).toBeNull()
  })

  it('avec onReviseTheme : bouton actif sur le thème le plus faible ; onReplayErrors reçoit code-route', () => {
    const onReviseTheme = vi.fn()
    const onReplayErrors = vi.fn()
    const { container } = renderExam({ onReviseTheme, onReplayErrors })
    play(container, ['r1'])
    const revise = screen.getByText('exam_revise_theme')
    expect(revise.disabled).toBe(false)
    fireEvent.click(revise)
    expect(onReviseTheme).toHaveBeenCalledWith('circulation')
    fireEvent.click(screen.getByText('exam_replay_errors:1'))
    expect(onReplayErrors).toHaveBeenCalledWith('code-route')
  })

  it('sans-faute : le bouton « Réviser ce thème » est désactivé (rien à réviser)', () => {
    const onReviseTheme = vi.fn()
    const { container } = renderExam({ onReviseTheme })
    play(container)
    expect(container.querySelector('.hero-score').getAttribute('aria-label')).toBe('4/4')
    expect(container.querySelector('.confetti')).toBeTruthy()
    expect(screen.getByText('exam_revise_theme').disabled).toBe(true)
    expect(screen.queryByText('exam_theme_weak')).toBeNull()
  })

  it('« Refaire un examen » repart des règles ; quitter demande confirmation', () => {
    const { container, onExit } = renderExam()
    play(container)
    fireEvent.click(screen.getByText('exam_retry'))
    expect(screen.getByText('exam_begin')).toBeTruthy()
    fireEvent.click(screen.getByText('exam_begin'))
    fireEvent.click(screen.getByText('quit'))
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    fireEvent.click(screen.getByText('exam_quit_cancel'))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    fireEvent.click(screen.getByText('quit'))
    fireEvent.click(screen.getByText('exam_quit_confirm'))
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
