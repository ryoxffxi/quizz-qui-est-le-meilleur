import { describe, expect, it } from 'vitest'
import { EXAM_PASS, EXAM_QUESTIONS, EXAM_SIGN_QUESTIONS } from './game'
import { mulberry32 } from './quiz'
import {
  buildExamDeck,
  computeExamResult,
  themeOf,
  THEME_ALIASES,
  THEMES,
  THEME_OTHER,
} from './exam'

// --- Fabriques de questions -------------------------------------------------
// Toutes les questions ont la bonne réponse en position 1 ('b') : après
// mélange des options, options[correct] doit toujours valoir 'b'.
const mkQ = (id, extra = {}) => ({
  id,
  question: `Question ${id}`,
  options: ['a', 'b', 'c', 'd'],
  correct: 1,
  explanation: 'parce que',
  difficulty: 'facile',
  ...extra,
})
const route = (n, start = 0) =>
  Array.from({ length: n }, (_, i) =>
    mkQ(`route_${start + i}`, {
      category: 'code-route',
      difficulty: i % 2 ? 'expert' : 'facile',
    }),
  )
// Deux questions par image (facile + expert du même panneau), comme la banque.
const signs = (n) =>
  Array.from({ length: n }, (_, i) =>
    mkQ(`pan_${i}`, { category: 'panneaux', image: `img${Math.floor(i / 2)}` }),
  )
const ids = (deck) => deck.map((q) => q.id)
const ofCat = (deck, cat) => deck.filter((q) => q.category === cat)

describe('THEMES', () => {
  it('liste les 10 thèmes officiels, ids stables et uniques', () => {
    expect(THEMES).toEqual([
      'circulation',
      'conducteur',
      'route',
      'usagers',
      'notions',
      'secours',
      'vehicule_prendre_quitter',
      'mecanique',
      'securite',
      'environnement',
    ])
    expect(new Set(THEMES).size).toBe(10)
    expect(THEME_OTHER).toBe('autre')
    expect(THEMES).not.toContain(THEME_OTHER)
  })

  it('résout le thème d’une question : id officiel, alias, sinon « autre »', () => {
    expect(themeOf({ theme: 'route' })).toBe('route')
    expect(themeOf({ theme: 'signalisation' })).toBe('circulation') // banque panneaux
    expect(themeOf({ theme: 'bidon' })).toBe(THEME_OTHER)
    expect(themeOf({})).toBe(THEME_OTHER)
    expect(themeOf(undefined)).toBe(THEME_OTHER)
    Object.values(THEME_ALIASES).forEach((id) => expect(THEMES).toContain(id))
  })
})

describe('buildExamDeck', () => {
  it('tire 40 questions : 8 panneaux avec image + 32 code de la route, sans doublon', () => {
    const deck = buildExamDeck({ route: route(120), panneaux: signs(40), rng: mulberry32(1) })
    expect(deck).toHaveLength(EXAM_QUESTIONS)
    const pan = ofCat(deck, 'panneaux')
    expect(pan).toHaveLength(EXAM_SIGN_QUESTIONS)
    expect(pan.every((q) => typeof q.image === 'string')).toBe(true)
    expect(ofCat(deck, 'code-route')).toHaveLength(EXAM_QUESTIONS - EXAM_SIGN_QUESTIONS)
    expect(new Set(ids(deck)).size).toBe(EXAM_QUESTIONS)
  })

  it('évite deux questions sur le même panneau quand la banque le permet', () => {
    const deck = buildExamDeck({ route: route(60), panneaux: signs(40), rng: mulberry32(7) })
    const images = ofCat(deck, 'panneaux').map((q) => q.image)
    expect(new Set(images).size).toBe(EXAM_SIGN_QUESTIONS)
  })

  it('accepte deux questions par image seulement quand il n’y a pas assez d’images', () => {
    // 10 questions sur 5 images : il faut en reprendre 3 pour atteindre 8.
    const deck = buildExamDeck({ route: route(60), panneaux: signs(10), rng: mulberry32(3) })
    const pan = ofCat(deck, 'panneaux')
    expect(pan).toHaveLength(EXAM_SIGN_QUESTIONS)
    expect(new Set(pan.map((q) => q.image)).size).toBe(5)
  })

  it('privilégie les questions code-route jamais vues', () => {
    const pool = route(100)
    const seen = new Set(pool.slice(0, 70).map((q) => q.id)) // 30 non vues
    const deck = buildExamDeck({ route: pool, panneaux: signs(40), seen, rng: mulberry32(11) })
    const picked = ids(ofCat(deck, 'code-route'))
    const unseenIds = pool.slice(70).map((q) => q.id)
    unseenIds.forEach((id) => expect(picked).toContain(id))
    expect(picked.filter((id) => seen.has(id))).toHaveLength(2)
  })

  it('complète avec des questions déjà vues quand tout a été vu', () => {
    const pool = route(50)
    const seen = new Set(pool.map((q) => q.id))
    const deck = buildExamDeck({ route: pool, panneaux: signs(40), seen, rng: mulberry32(5) })
    expect(ofCat(deck, 'code-route')).toHaveLength(EXAM_QUESTIONS - EXAM_SIGN_QUESTIONS)
  })

  it('est déterministe pour un générateur donné', () => {
    const args = { route: route(80), panneaux: signs(30) }
    const a = buildExamDeck({ ...args, rng: mulberry32(42) })
    const b = buildExamDeck({ ...args, rng: mulberry32(42) })
    const c = buildExamDeck({ ...args, rng: mulberry32(43) })
    expect(ids(a)).toEqual(ids(b))
    expect(ids(a)).not.toEqual(ids(c))
  })

  it('mélange les options en gardant la bonne réponse', () => {
    const deck = buildExamDeck({ route: route(60), panneaux: signs(20), rng: mulberry32(9) })
    deck.forEach((q) => {
      expect(q.options).toHaveLength(4)
      expect(q.options[q.correct]).toBe('b')
    })
  })

  it('ne modifie pas les banques d’origine', () => {
    const r = route(60)
    const p = signs(20)
    const snapshot = JSON.stringify([r, p])
    buildExamDeck({ route: r, panneaux: p, rng: mulberry32(2) })
    expect(JSON.stringify([r, p])).toBe(snapshot)
  })

  it('comble avec du code-route quand il manque des panneaux', () => {
    const deck = buildExamDeck({ route: route(60), panneaux: signs(3), rng: mulberry32(4) })
    expect(deck).toHaveLength(EXAM_QUESTIONS)
    expect(ofCat(deck, 'panneaux')).toHaveLength(3)
    expect(ofCat(deck, 'code-route')).toHaveLength(EXAM_QUESTIONS - 3)
  })

  it('ignore les questions panneaux sans image', () => {
    const noImage = signs(20).map((q) => ({ ...q, image: undefined }))
    const deck = buildExamDeck({ route: route(60), panneaux: noImage, rng: mulberry32(6) })
    expect(ofCat(deck, 'panneaux')).toHaveLength(0)
    expect(deck).toHaveLength(EXAM_QUESTIONS)
  })

  it('rend un paquet plus court (ou vide) si les banques sont trop petites', () => {
    expect(buildExamDeck({ route: route(10), panneaux: signs(2), rng: mulberry32(8) })).toHaveLength(12)
    expect(buildExamDeck({ route: [], panneaux: [] })).toEqual([])
    expect(buildExamDeck({})).toEqual([])
  })

  it('explicite la catégorie quand elle manque sur la question', () => {
    const r = route(40).map((q) => ({ ...q, category: undefined }))
    const p = signs(10).map((q) => ({ ...q, category: undefined }))
    const deck = buildExamDeck({ route: r, panneaux: p, rng: mulberry32(12) })
    expect(deck.every((q) => q.category === 'code-route' || q.category === 'panneaux')).toBe(true)
    // 10 questions sur 5 images : les 8 panneaux sont atteints en reprenant des images.
    expect(ofCat(deck, 'panneaux')).toHaveLength(EXAM_SIGN_QUESTIONS)
    expect(ofCat(deck, 'code-route')).toHaveLength(EXAM_QUESTIONS - EXAM_SIGN_QUESTIONS)
  })
})

describe('computeExamResult', () => {
  const answered = (n, ok, extra = {}) =>
    Array.from({ length: n }, (_, i) => ({
      question: mkQ(`q_${extra.theme || 'x'}_${i}`, extra),
      chosen: ok ? 1 : 0,
    }))

  it('compte le score et applique le seuil de 35/40', () => {
    const pass = computeExamResult([...answered(EXAM_PASS, true), ...answered(5, false)])
    expect(pass.score).toBe(EXAM_PASS)
    expect(pass.total).toBe(EXAM_QUESTIONS)
    expect(pass.passed).toBe(true)
    expect(pass.results).toHaveLength(EXAM_QUESTIONS)
    expect(pass.results.filter(Boolean)).toHaveLength(EXAM_PASS)
    expect(pass.mistakes).toHaveLength(5)

    const fail = computeExamResult([...answered(EXAM_PASS - 1, true), ...answered(6, false)])
    expect(fail.score).toBe(EXAM_PASS - 1)
    expect(fail.passed).toBe(false)
  })

  it('compte une réponse manquante (temps écoulé) comme fausse, avec chosen à null', () => {
    const res = computeExamResult([
      { question: mkQ('a'), chosen: 1 },
      { question: mkQ('b'), chosen: null },
      { question: mkQ('c'), chosen: undefined },
    ])
    expect(res.score).toBe(1)
    expect(res.results).toEqual([true, false, false])
    expect(res.mistakes.map((m) => m.chosen)).toEqual([null, null])
    expect(res.mistakes[0].question.id).toBe('b')
  })

  it('regroupe par thème dans l’ordre officiel, « autre » en dernier', () => {
    const res = computeExamResult([
      { question: mkQ('r1', { theme: 'route' }), chosen: 1 },
      { question: mkQ('r2', { theme: 'route' }), chosen: 0 },
      { question: mkQ('c1', { theme: 'circulation' }), chosen: 1 },
      { question: mkQ('n1'), chosen: 1 },
      { question: mkQ('n2', { theme: 'bidon' }), chosen: 0 },
    ])
    expect(res.byTheme).toEqual([
      { theme: 'circulation', correct: 1, total: 1 },
      { theme: 'route', correct: 1, total: 2 },
      { theme: THEME_OTHER, correct: 1, total: 2 },
    ])
    expect(res.weakest).toBe('route')
  })

  it('range les questions de panneaux (theme « signalisation ») sous la circulation', () => {
    const res = computeExamResult([
      { question: mkQ('p1', { theme: 'signalisation', image: 'img0' }), chosen: 1 },
      { question: mkQ('p2', { theme: 'signalisation', image: 'img1' }), chosen: 0 },
    ])
    expect(res.byTheme).toEqual([{ theme: 'circulation', correct: 1, total: 2 }])
    expect(res.weakest).toBe('circulation')
  })

  it('désigne le thème le plus faible hors « autre », null s’il n’y a rien à réviser', () => {
    const mixed = computeExamResult([
      ...answered(3, true, { theme: 'secours' }),
      ...answered(1, false, { theme: 'secours' }), // 3/4
      ...answered(1, true, { theme: 'mecanique' }),
      ...answered(2, false, { theme: 'mecanique' }), // 1/3 : le plus faible
      ...answered(4, false), // 'autre' à 0/4, ignoré
    ])
    expect(mixed.weakest).toBe('mecanique')

    const perfect = computeExamResult(answered(5, true, { theme: 'route' }))
    expect(perfect.weakest).toBeNull()

    const untagged = computeExamResult(answered(5, false))
    expect(untagged.byTheme).toEqual([{ theme: THEME_OTHER, correct: 0, total: 5 }])
    expect(untagged.weakest).toBeNull()
  })

  it('supporte une liste vide', () => {
    const res = computeExamResult([])
    expect(res).toMatchObject({ score: 0, total: 0, passed: false, byTheme: [], mistakes: [], results: [], weakest: null })
  })
})
