// @vitest-environment jsdom
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

// ---- Banque de test : 3 questions faciles, 1 experte ----
const FACILE = [
  {
    id: 'f1',
    difficulty: 'facile',
    question: 'Q f1',
    options: ['A1', 'B1', 'C1', 'D1'],
    correct: 0,
    explanation: 'Expl f1',
    image: 'stop',
  },
  {
    id: 'f2',
    difficulty: 'facile',
    question: 'Q f2',
    options: ['A2', 'B2', 'C2', 'D2'],
    correct: 1,
    explanation: 'Expl f2',
    image: 'sens-interdit',
  },
  {
    id: 'f3',
    difficulty: 'facile',
    question: 'Q f3',
    options: ['Stop', 'Céder', 'Interdit', 'Danger'],
    correct: 2,
    explanation: 'Expl f3',
    optionImages: ['stop', 'ceder', 'sens-interdit', 'danger'],
  },
]
const EXPERT = [
  {
    id: 'x1',
    difficulty: 'expert',
    question: 'Q x1',
    options: ['AX', 'BX', 'CX', 'DX'],
    correct: 3,
    explanation: 'Expl x1',
  },
]
const ALL = [...FACILE, ...EXPERT]
const SIGNS = {
  stop: { family: 'priorite' },
  ceder: { family: 'priorite' },
  'sens-interdit': { family: 'interdiction' },
  danger: { family: 'danger' },
}

// ---- Dépendances des autres chantiers, isolées ----
vi.mock('../i18n', () => ({
  useI18n: () => ({
    lang: 'fr',
    // t() renvoie la clé, suivie des variables : assertions lisibles.
    t: (key, vars) => (vars ? `${key}:${Object.values(vars).join(',')}` : key),
  }),
}))
vi.mock('../content', () => ({
  getCategory: (id) => ({ id, labelKey: `cat_${id}`, gradient: ['#000', '#111'] }),
  getLocalizedQuestions: (cat, diff) => (diff === 'expert' ? EXPERT : FACILE),
  countQuestions: () => 3,
}))
vi.mock('../content/panneaux/signs', () => ({
  getSign: (id) => SIGNS[id],
  familyOf: (id) => SIGNS[id]?.family,
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
    setMuted: vi.fn(),
    isMuted: () => false,
  },
}))
vi.mock('./SignImage', () => ({
  default: ({ id, className, alt }) => (
    <span className={className} data-sign={id} data-alt={alt === undefined ? 'auto' : alt} />
  ),
}))
vi.mock('./ResultShare', () => ({
  default: ({ resultData }) => (
    <div data-testid="share" data-mode={resultData.mode} data-grid={resultData.grid} />
  ),
}))
vi.mock('./ResultAd', () => ({ default: () => null }))
vi.mock('./icons', () => ({
  CatIcon: () => null,
  IconCheck: () => <i data-icon="check" />,
  IconX: () => <i data-icon="x" />,
  IconFlame: () => <i data-icon="flame" />,
}))

import SoloQuiz from './SoloQuiz'
import { track } from '../lib/analytics'
import { sound } from '../lib/sound'
import { getStats } from '../lib/stats'
import { countErrors, getErrorIds, recordFail } from '../lib/errors'
import { loadSeen, saveSeen } from '../lib/revision'

const CAT = 'code-route'

function renderSolo(props = {}) {
  const onExit = vi.fn()
  const onChallenge = vi.fn()
  const onReplayErrors = vi.fn()
  const utils = render(
    <StrictMode>
      <SoloQuiz
        categoryId={CAT}
        difficulty="facile"
        onExit={onExit}
        onChallenge={onChallenge}
        onReplayErrors={onReplayErrors}
        {...props}
      />
    </StrictMode>,
  )
  return { ...utils, onExit, onChallenge, onReplayErrors }
}

// Question affichée (retrouvée par son énoncé).
function current(container) {
  const text = container.querySelector('.quiz-question').textContent
  return ALL.find((q) => q.question === text)
}
const options = (container) => [...container.querySelectorAll('.option')]
const key = (k) => fireEvent.keyDown(window, { key: k })

// Répond à la question courante (juste ou faux) et renvoie la question.
function answer(container, correct) {
  const q = current(container)
  const idx = correct ? q.correct : (q.correct + 1) % q.options.length
  fireEvent.click(options(container)[idx])
  return q
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  // Animations réduites : compteur et anneau affichés d'emblée (pas de rAF).
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

describe('SoloQuiz : question en cours', () => {
  it('affiche le lot, la barre de progression accessible et trace solo_start une fois', () => {
    const { container } = renderSolo()
    expect(screen.getByText('solo_lot_progress:1,1,3')).toBeTruthy()
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar.getAttribute('aria-valuenow')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('3')
    // Contrat design : remplissage par --fill (0..1), plus de width inline.
    const fill = container.querySelector('.progress-fill')
    expect(fill.style.getPropertyValue('--fill')).toBe('0')
    expect(fill.style.width).toBe('')
    // Options courtes : grille 2 x 2 sur grand écran.
    expect(container.querySelector('.options').className).toContain('grid')
    expect(options(container)).toHaveLength(4)
    // StrictMode monte deux fois : un seul événement.
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('solo_start', CAT)
    // Pas encore de compteur de session.
    expect(container.querySelector('.solo-session-pill')).toBeNull()
  })

  it('bonne réponse : ✓ sur la bonne option, progression, stats, vue, compteur de session', () => {
    const { container } = renderSolo()
    const q = answer(container, true)
    expect(screen.getByText('feedback_correct')).toBeTruthy()
    expect(sound.correct).toHaveBeenCalledTimes(1)
    const opts = options(container)
    expect(opts[q.correct].className).toContain('correct')
    expect(opts[q.correct].querySelector('[data-icon="check"]')).toBeTruthy()
    expect(container.querySelectorAll('[data-icon="x"]')).toHaveLength(0)
    expect(container.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('1')
    expect(container.querySelector('.progress-fill').style.getPropertyValue('--fill')).toMatch(
      /^0\.333/,
    )
    expect(container.querySelector('.solo-session-pill').textContent).toBe('solo_session_counter:1,100')
    // Enregistré à la validation, pas en fin de lot.
    const s = getStats()
    expect(s.total).toEqual({ answered: 1, correct: 1 })
    expect(s.byKey['code-route:facile']).toMatchObject({ answered: 1, correct: 1 })
    expect(loadSeen(CAT, 'facile').has(q.id)).toBe(true)
    expect(countErrors(CAT)).toBe(0)
    // Une seconde réponse est ignorée.
    fireEvent.click(opts[(q.correct + 1) % 4])
    expect(getStats().total.answered).toBe(1)
  })

  it('mauvaise réponse : ✗ sur le choix, ✓ sur la bonne, entrée en banque d’erreurs', () => {
    const { container } = renderSolo()
    const q = answer(container, false)
    expect(screen.getByText('feedback_wrong')).toBeTruthy()
    expect(screen.getByText(q.explanation)).toBeTruthy()
    expect(sound.wrong).toHaveBeenCalledTimes(1)
    const opts = options(container)
    const chosen = (q.correct + 1) % 4
    expect(opts[chosen].className).toContain('wrong')
    expect(opts[chosen].querySelector('[data-icon="x"]')).toBeTruthy()
    expect(opts[q.correct].querySelector('[data-icon="check"]')).toBeTruthy()
    expect(countErrors(CAT)).toBe(1)
    expect(container.querySelector('.solo-session-pill').textContent).toBe('solo_session_counter:1,0')
  })

  it('clavier : 1-4 / A-D répondent, Entrée passe à la suite', () => {
    const { container } = renderSolo()
    const q = current(container)
    key('Enter') // rien tant que ce n'est pas validé
    expect(getStats().total.answered).toBe(0)
    key(String(q.correct + 1))
    expect(getStats().total).toEqual({ answered: 1, correct: 1 })
    key('Enter')
    expect(screen.getByText('solo_lot_progress:1,2,3')).toBeTruthy()
    const q2 = current(container)
    key('ABCD'[q2.correct].toLowerCase())
    expect(getStats().total.answered).toBe(2)
    key(' ')
    expect(screen.getByText('solo_lot_progress:1,3,3')).toBeTruthy()
  })

  it('après validation, un tap hors feedback/options avance ; sur le feedback, non', () => {
    const { container } = renderSolo()
    answer(container, true)
    fireEvent.click(container.querySelector('.feedback'))
    expect(screen.getByText('solo_lot_progress:1,1,3')).toBeTruthy()
    fireEvent.click(container.querySelector('.quiz-question'))
    expect(screen.getByText('solo_lot_progress:1,2,3')).toBeTruthy()
  })

  it('options illustrées : image dans le bouton, nom masqué mais présent', () => {
    // Seule f3 a des optionImages : on avance jusqu'à elle.
    const { container } = renderSolo()
    for (let i = 0; i < 3; i++) {
      if (current(container).id === 'f3') break
      answer(container, true)
      key('Enter')
    }
    expect(current(container).id).toBe('f3')
    const opts = options(container)
    expect(opts[0].className).toContain('has-sign')
    expect(opts[0].getAttribute('aria-label')).toBe('Stop')
    const sign = opts[0].querySelector('.option-sign')
    expect(sign.getAttribute('data-sign')).toBe('stop')
    // Image décorative (alt="") : le nom est déjà dans aria-label.
    expect(sign.getAttribute('data-alt')).toBe('')
    expect(opts[0].querySelector('.option-text').className).toContain('sr-only')
    // Le panneau de l'énoncé, lui, garde sa description neutre.
    expect(container.querySelector('.options').className).toContain('grid')
  })

  it('le panneau de l’énoncé garde sa description neutre (alt automatique)', () => {
    const { container } = renderSolo({ imageFamily: 'interdiction' })
    // f2 (image sens-interdit) ou f3 (bonne option sens-interdit).
    const q = current(container)
    if (q.id === 'f2') {
      expect(container.querySelector('.quiz-sign').getAttribute('data-alt')).toBe('auto')
    } else {
      expect(container.querySelector('.quiz-sign')).toBeNull()
    }
  })
})

describe('SoloQuiz : fin de lot et session', () => {
  it('sans-faute : résultat 5 paliers, record, partage, bilan quand la banque est épuisée', () => {
    const { container, onExit } = renderSolo()
    for (let i = 0; i < 3; i++) {
      answer(container, true)
      fireEvent.click(screen.getByText(i < 2 ? 'next_question' : 'see_recap'))
    }
    expect(track).toHaveBeenCalledWith('solo_lot_end', CAT)
    expect(sound.win).toHaveBeenCalledTimes(1)
    expect(screen.getByText('personality_genius')).toBeTruthy()
    expect(container.querySelector('.hero-score').getAttribute('aria-label')).toBe('3/3')
    expect(container.querySelector('.confetti')).toBeTruthy()
    expect(screen.getByText('solo_record:3,3')).toBeTruthy()
    expect(screen.getByText(/solo_record_new/)).toBeTruthy()
    expect(container.querySelector('.solo-chip.new')).toBeTruthy()
    expect(screen.getByText('solo_streak_one')).toBeTruthy()
    // Un seul « sans faute » : le bilan de session n'affiche le récap qu'avec des erreurs.
    expect(screen.getAllByText('recap_perfect')).toHaveLength(1)
    const share = screen.getByTestId('share')
    expect(share.getAttribute('data-mode')).toBe('solo')
    expect(share.getAttribute('data-grid')).toBe('VVV')
    // Banque de 3 épuisée : pas d'« Encore », bilan de session, Accueil.
    expect(screen.queryByText(/^solo_again/)).toBeNull()
    expect(screen.getByText('solo_session_done')).toBeTruthy()
    expect(screen.queryByText(/^solo_replay_errors/)).toBeNull()
    fireEvent.click(screen.getByText('home'))
    expect(onExit).toHaveBeenCalledTimes(1)
    const s = getStats()
    expect(s.byKey['code-route:facile']).toMatchObject({ best: 3, bestTotal: 3, rounds: 1 })
    expect(s.history).toHaveLength(1)
  })

  it('avec des erreurs : palier bas, récap, bouton « Rejouer mes erreurs (n) »', () => {
    const { container, onReplayErrors } = renderSolo()
    for (let i = 0; i < 3; i++) {
      answer(container, i === 0)
      fireEvent.click(screen.getByText(i < 2 ? 'next_question' : 'see_recap'))
    }
    expect(sound.win).not.toHaveBeenCalled()
    expect(screen.getByText('personality_bad')).toBeTruthy()
    expect(container.querySelector('.recap')).toBeTruthy()
    expect(screen.getAllByText('recap_title:2').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByText('solo_replay_errors:2'))
    expect(onReplayErrors).toHaveBeenCalledTimes(1)
  })

  it('quitter en cours de route : bilan de session, puis reprise ou accueil', () => {
    const { container, onExit } = renderSolo()
    // Rien joué : sortie directe.
    fireEvent.click(screen.getByText('quit'))
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('solo_quit', CAT)
    answer(container, false)
    fireEvent.click(screen.getByText('quit'))
    expect(screen.getByText('solo_session_title')).toBeTruthy()
    expect(container.querySelector('.hero-score').getAttribute('aria-label')).toBe('0/1')
    expect(screen.getByText('solo_session_errors:1')).toBeTruthy()
    fireEvent.click(screen.getByText('solo_resume'))
    expect(screen.getByText('feedback_wrong')).toBeTruthy()
  })
})

describe('SoloQuiz : filtres', () => {
  it('imageFamily restreint la banque à une famille, questions inversées comprises', () => {
    // f2 : image sens-interdit ; f3 : sans image, bonne option sens-interdit.
    const { container } = renderSolo({ imageFamily: 'interdiction' })
    expect(screen.getByText('solo_lot_progress:1,1,2')).toBeTruthy()
    const played = new Set()
    for (let i = 0; i < 2; i++) {
      played.add(answer(container, true).id)
      key('Enter')
    }
    expect(played).toEqual(new Set(['f2', 'f3']))
  })

  it('imageFamily sans question (famille des distracteurs seulement) : « Aucune question » et Accueil', () => {
    // danger n'apparaît qu'en distracteur de f3 : la famille n'a rien à jouer.
    const { onExit } = renderSolo({ imageFamily: 'danger' })
    expect(screen.getByText('solo_empty')).toBeTruthy()
    fireEvent.click(screen.getByText('home'))
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('élague au montage les ids absents de la banque (vues et erreurs), sans toucher aux autres familles', () => {
    saveSeen(CAT, 'facile', new Set(['f1', 'disparue_1', 'disparue_2']))
    renderSolo({ imageFamily: 'interdiction' })
    // f1 (priorité) reste : la référence est le niveau entier, pas la famille.
    expect([...loadSeen(CAT, 'facile')]).toEqual(['f1'])
    cleanup()
    recordFail(CAT, 'x1')
    recordFail(CAT, 'supprimee')
    renderSolo({ mode: 'errors', difficulty: undefined })
    expect(getErrorIds(CAT)).toEqual(['x1'])
    expect(countErrors(CAT)).toBe(1)
    expect(screen.getByText('errors_lot_progress:1,1')).toBeTruthy()
  })

  it('mode erreurs : les deux niveaux, titre dédié, retrait après deux réussites', () => {
    recordFail(CAT, 'f1')
    recordFail(CAT, 'x1')
    const { container } = renderSolo({ mode: 'errors', difficulty: undefined })
    expect(track).toHaveBeenCalledWith('errors_replay', CAT)
    expect(screen.getByText('errors_lot_progress:1,2')).toBeTruthy()
    expect(container.querySelector('.quiz-cat').textContent).toContain('errors_title')
    const seen = new Set()
    for (let i = 0; i < 2; i++) {
      const q = answer(container, true)
      seen.add(q.id)
      fireEvent.click(screen.getByText(i === 0 ? 'next_question' : 'see_recap'))
    }
    expect(seen).toEqual(new Set(['f1', 'x1']))
    // Une réussite chacune : toujours en banque (retrait au bout de deux).
    expect(countErrors(CAT)).toBe(2)
    // Le mode erreurs ne pollue pas la mémoire « vues » d'un niveau.
    expect(loadSeen(CAT, 'facile').size).toBe(0)
    expect(loadSeen(CAT, 'undefined').size).toBe(0)
    expect(screen.getByTestId('share').getAttribute('data-mode')).toBe('erreurs')
    expect(getStats().byKey['code-route:erreurs']).toMatchObject({ best: 2, rounds: 1 })
    expect(getStats().byKey['code-route:facile']).toMatchObject({ answered: 1, correct: 1 })
    expect(getStats().byKey['code-route:expert']).toMatchObject({ answered: 1, correct: 1 })
  })

  it('mode erreurs sans erreur : « Plus rien à revoir » et Accueil', () => {
    const { onExit } = renderSolo({ mode: 'errors' })
    expect(screen.getByText('errors_empty_title')).toBeTruthy()
    fireEvent.click(screen.getByText('home'))
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
