// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadSeen, markSeen, pickSoloBatch, saveSeen } from './revision'

const makePool = (n) => Array.from({ length: n }, (_, i) => ({ id: `q${i + 1}` }))
const ids = (qs) => qs.map((q) => q.id)
const hasDup = (qs) => new Set(ids(qs)).size !== qs.length

beforeEach(() => localStorage.clear())

describe('pickSoloBatch', () => {
  it('sert d’abord les questions jamais vues', () => {
    const pool = makePool(30)
    const store = new Set(ids(pool.slice(0, 20)))
    const { questions, cycleReset } = pickSoloBatch(pool, store, new Set(), 10)
    expect(questions).toHaveLength(10)
    expect(new Set(ids(questions))).toEqual(new Set(ids(pool.slice(20))))
    expect(cycleReset).toBe(false)
  })

  it('complète sans doublon quand il manque des non-vues, et signale le cycle', () => {
    const pool = makePool(30)
    const store = new Set(ids(pool.slice(0, 27))) // 3 non-vues seulement
    const { questions, cycleReset } = pickSoloBatch(pool, store, new Set(), 10)
    expect(questions).toHaveLength(10)
    expect(hasDup(questions)).toBe(false)
    // Les 3 non-vues sont toutes présentes.
    for (const q of pool.slice(27)) expect(ids(questions)).toContain(q.id)
    expect(cycleReset).toBe(true)
  })

  it('ne ressert jamais une question déjà jouée cette session', () => {
    const pool = makePool(30)
    const session = new Set(ids(pool.slice(0, 25)))
    const { questions, cycleReset } = pickSoloBatch(pool, new Set(), session, 10)
    expect(questions).toHaveLength(5) // dernier lot plus court
    for (const q of questions) expect(session.has(q.id)).toBe(false)
    expect(cycleReset).toBe(false)
  })

  it('renvoie un lot vide quand la session a tout joué', () => {
    const pool = makePool(12)
    const session = new Set(ids(pool))
    expect(pickSoloBatch(pool, new Set(), session, 10)).toEqual({ questions: [], cycleReset: false })
  })

  it('est pure : n’écrit rien et ne modifie pas ses arguments', () => {
    const pool = makePool(15)
    const store = new Set(ids(pool.slice(0, 12)))
    const session = new Set(['q13'])
    const storeBefore = [...store]
    pickSoloBatch(pool, store, session, 10)
    expect([...store]).toEqual(storeBefore)
    expect([...session]).toEqual(['q13'])
    expect(pool).toHaveLength(15)
    expect(localStorage.length).toBe(0)
  })

  it('accepte une banque plus petite que le lot', () => {
    const pool = makePool(4)
    const { questions, cycleReset } = pickSoloBatch(pool, new Set(), new Set(), 10)
    expect(questions).toHaveLength(4)
    expect(cycleReset).toBe(false)
  })

  it('ignore les ids du store absents de la banque (questions retirées)', () => {
    const pool = makePool(30)
    // 20 vues encore en banque + 50 ids fantômes : lot plein, pas de cycle.
    const store = new Set([...ids(pool.slice(0, 20)), ...makePool(50).map((q) => `fantome_${q.id}`)])
    const r1 = pickSoloBatch(pool, store, new Set(), 10)
    expect(r1.questions).toHaveLength(10)
    expect(new Set(ids(r1.questions))).toEqual(new Set(ids(pool.slice(20))))
    expect(r1.cycleReset).toBe(false)
    // Toutes vues + fantômes : le cycle se boucle normalement.
    const full = new Set([...ids(pool), 'fantome_a', 'fantome_b'])
    const r2 = pickSoloBatch(pool, full, new Set(), 10)
    expect(r2.questions).toHaveLength(10)
    expect(hasDup(r2.questions)).toBe(false)
    expect(r2.cycleReset).toBe(true)
  })

  it('couvre toute une banque de 249 questions en 25 sessions d’un lot', () => {
    const pool = makePool(249)
    const served = new Set()
    let resets = 0
    for (let session = 1; session <= 25; session++) {
      const store = loadSeen('code-route', 'facile') // nouvelle session : store relu
      const { questions, cycleReset } = pickSoloBatch(pool, store, new Set(), 10)
      expect(hasDup(questions)).toBe(false)
      expect(questions).toHaveLength(10)
      if (cycleReset) {
        resets += 1
        expect(session).toBe(25)
        store.clear()
      }
      questions.forEach((q) => {
        served.add(q.id)
        store.add(q.id)
      })
      saveSeen('code-route', 'facile', store)
    }
    expect(served.size).toBe(249)
    expect(resets).toBe(1)
    // Nouveau cycle : seules les 10 questions du dernier lot sont marquées.
    expect(loadSeen('code-route', 'facile').size).toBe(10)
  })
})

describe('markSeen', () => {
  it('persiste une question vue sans doublon', () => {
    markSeen('code-route', 'facile', 'q1')
    markSeen('code-route', 'facile', 'q1')
    markSeen('code-route', 'facile', 'q2')
    expect([...loadSeen('code-route', 'facile')].sort()).toEqual(['q1', 'q2'])
    expect(loadSeen('code-route', 'expert').size).toBe(0)
  })
})

describe('loadSeen avec une banque', () => {
  it('élague les ids absents de la banque et met le stockage à jour', () => {
    saveSeen('code-route', 'facile', new Set(['q1', 'q2', 'retiree', 'relabel']))
    const pool = makePool(3)
    expect([...loadSeen('code-route', 'facile', pool)].sort()).toEqual(['q1', 'q2'])
    // Stockage réécrit : une lecture sans banque ne voit plus les fantômes.
    expect([...loadSeen('code-route', 'facile')].sort()).toEqual(['q1', 'q2'])
    // Accepte aussi des ids (Set ou tableau) ; rien à élaguer → aucune écriture.
    localStorage.clear()
    saveSeen('code-route', 'facile', new Set(['q1']))
    const before = localStorage.getItem('quizz_seen_code-route_facile')
    expect([...loadSeen('code-route', 'facile', new Set(['q1', 'q2']))]).toEqual(['q1'])
    expect([...loadSeen('code-route', 'facile', ['q1'])]).toEqual(['q1'])
    expect(localStorage.getItem('quizz_seen_code-route_facile')).toBe(before)
  })

  it('tolère un stockage illisible ou d’une autre forme', () => {
    localStorage.setItem('quizz_seen_code-route_facile', '{"a":1}')
    expect(loadSeen('code-route', 'facile').size).toBe(0)
    localStorage.setItem('quizz_seen_code-route_facile', '[1,')
    expect(loadSeen('code-route', 'facile', makePool(2)).size).toBe(0)
  })
})
