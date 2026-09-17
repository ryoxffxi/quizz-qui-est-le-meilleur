// Banque panneaux : dessins, tri, pièges, générateur déterministe.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  FAMILIES,
  SIGNS,
  compareCodes,
  familyOf,
  getSign,
} from '../src/content/panneaux/signs.js'
import { DETAILS } from '../src/content/panneaux/details.js'
import { CONFUSIONS, confusionsBySign } from '../src/content/panneaux/confusions.js'
import {
  OUT,
  THEME,
  buildPanneauxQuiz,
  sentence,
  serialize,
} from './build-panneaux-quiz.mjs'

const DASH = '—'
const TABLE = confusionsBySign(SIGNS.map((s) => s.id))

describe('signs.js', () => {
  it('trie par famille (ordre de FAMILIES) puis par code naturel', () => {
    const rank = new Map(FAMILIES.map((f, i) => [f.id, i]))
    for (let i = 1; i < SIGNS.length; i++) {
      const a = SIGNS[i - 1]
      const b = SIGNS[i]
      const fa = rank.get(a.family)
      const fb = rank.get(b.family)
      expect(fa <= fb).toBe(true)
      if (fa === fb) expect(compareCodes(a.code, b.code) <= 0).toBe(true)
    }
    const codes = SIGNS.filter((s) => s.family === 'danger').map((s) => s.code)
    expect(codes.indexOf('A1a')).toBeLessThan(codes.indexOf('A1c'))
    expect(codes.indexOf('A2a')).toBeLessThan(codes.indexOf('A13a'))
    expect(codes.indexOf('A24')).toBeLessThan(codes.indexOf('AK5'))
  })

  it('compareCodes : ordre naturel', () => {
    expect(compareCodes('A1a', 'A1c')).toBeLessThan(0)
    expect(compareCodes('A2a', 'A13a')).toBeLessThan(0)
    expect(compareCodes('AB1', 'AB3a')).toBeLessThan(0)
    expect(compareCodes('B15', 'C18')).toBeLessThan(0)
    expect(compareCodes('B21a1', 'B21b')).toBeLessThan(0)
    expect(compareCodes('A16', 'A16')).toBe(0)
  })

  it('getSign / familyOf', () => {
    expect(getSign('ab4').code).toBe('AB4')
    expect(familyOf('ab4')).toBe('priorite')
    expect(familyOf('b40')).toBe('fin')
    expect(getSign('nope')).toBeUndefined()
    expect(familyOf('nope')).toBeUndefined()
  })

  it('ids uniques, familles connues, noms uniques, aucun tiret long', () => {
    const ids = new Set()
    const names = new Set()
    const fams = new Set(FAMILIES.map((f) => f.id))
    for (const s of SIGNS) {
      expect(ids.has(s.id)).toBe(false)
      ids.add(s.id)
      expect(names.has(s.name)).toBe(false)
      names.add(s.name)
      expect(fams.has(s.family)).toBe(true)
      expect(s.svg.startsWith('<svg')).toBe(true)
      for (const field of ['name', 'meaning', 'short', 'alt', 'detail']) {
        if (s[field]) expect(s[field]).not.toContain(DASH)
      }
    }
    for (const f of FAMILIES) {
      expect(f.label).not.toContain(DASH)
      expect(f.desc).not.toContain(DASH)
    }
  })

  it("la famille 'fin' s'appelle « Fin de prescription » (elle contient B40)", () => {
    expect(FAMILIES.find((f) => f.id === 'fin').label).toBe('Fin de prescription')
    expect(familyOf('b40')).toBe('fin')
  })

  it('AB1 est un vrai X (deux diagonales, sans rotate) ; A16 a son « 10% » hors de la pente', () => {
    const ab1 = getSign('ab1').svg
    expect(ab1).toContain('M90 118 L150 178 M150 118 L90 178')
    expect(ab1).not.toContain('rotate')
    const a16 = getSign('a16').svg
    const m = a16.match(/<text x="(\d+)" y="(\d+)"[^>]*>10%<\/text>/)
    expect(m).not.toBeNull()
    // La pente est le triangle (160,150) (160,184) (80,184) : le texte doit
    // rester au-dessus de l'hypoténuse, dans la zone blanche.
    const x = Number(m[1])
    const y = Number(m[2])
    const slopeY = 184 - ((x - 80) * 34) / 80
    expect(y).toBeLessThan(slopeY)
  })
})

describe('details.js', () => {
  it('chaque clé correspond à un panneau ; short ≤ 35 car. et réservé aux noms longs', () => {
    for (const [id, d] of Object.entries(DETAILS)) {
      const s = getSign(id)
      expect(s, `details.js : id inconnu ${id}`).toBeDefined()
      if (d.short) {
        expect(d.short.length).toBeLessThanOrEqual(35)
        expect(s.name.length).toBeGreaterThan(45)
      }
      for (const v of Object.values(d)) expect(v).not.toContain(DASH)
    }
  })

  it('tout nom de plus de 45 caractères a un nom court', () => {
    for (const s of SIGNS) {
      if (s.name.length > 45) expect(s.short, `${s.id} sans short`).toBeTruthy()
    }
  })

  it('au moins 20 panneaux ont une description alt, fusionnée dans SIGNS', () => {
    const withAlt = SIGNS.filter((s) => typeof s.alt === 'string' && s.alt.length > 10)
    expect(withAlt.length).toBeGreaterThanOrEqual(20)
    expect(getSign('ab4').alt).toBe(DETAILS.ab4.alt)
  })
})

describe('confusions.js', () => {
  it('table symétrique, ids connus, aucun tiret long', () => {
    for (const { a, b, tip } of CONFUSIONS) {
      expect(getSign(a)).toBeDefined()
      expect(getSign(b)).toBeDefined()
      expect(tip).not.toContain(DASH)
      expect(TABLE[a].some((c) => c.id === b && c.tip === tip)).toBe(true)
      expect(TABLE[b].some((c) => c.id === a && c.tip === tip)).toBe(true)
    }
  })

  it('les deux tips corrigés', () => {
    const ab1 = TABLE.ab1.find((c) => c.id === 'ab2').tip
    expect(ab1).toContain('vous cédez à ceux qui arrivent de votre droite')
    const b30 = TABLE.b14_50.find((c) => c.id === 'b30').tip
    expect(b30).toContain("les passages piétons n'y sont généralement pas matérialisés")
    expect(b30).not.toContain('traversent partout')
  })
})

describe('build-panneaux-quiz.mjs', () => {
  const questions = buildPanneauxQuiz()
  const byId = new Map(questions.map((q) => [q.id, q]))

  it('déterministe : la régénération donne exactement le fichier committé', () => {
    expect(serialize(questions)).toBe(readFileSync(OUT, 'utf8'))
    expect(serialize(buildPanneauxQuiz())).toBe(serialize(questions))
  })

  it('5 questions par panneau, ids stables', () => {
    expect(questions).toHaveLength(SIGNS.length * 5)
    for (const s of SIGNS) {
      for (const suffix of ['f', 'e', 'fi', 'ei', 'ff']) {
        expect(byId.has(`pan_${s.id}_${suffix}`), `pan_${s.id}_${suffix}`).toBe(true)
      }
    }
    const facile = questions.filter((q) => q.difficulty === 'facile').length
    expect(facile).toBe(SIGNS.length * 3)
  })

  it('chaque question : 4 options uniques, correct valide, theme, explication propre', () => {
    for (const q of questions) {
      expect(q.category).toBe('panneaux')
      expect(q.theme).toBe(THEME)
      expect(q.options.fr).toHaveLength(4)
      expect(new Set(q.options.fr).size).toBe(4)
      expect(q.correct).toBeGreaterThanOrEqual(0)
      expect(q.correct).toBeLessThanOrEqual(3)
      expect(q.explanation.fr).not.toContain(DASH)
      expect(q.question.fr).not.toContain(DASH)
      // Point final unique (jamais « …. ») ; une ellipse ferme aussi la phrase.
      expect(q.explanation.fr).toMatch(/[^.][.…]$/)
    }
  })

  it('sentence : un seul point final, ellipse conservée', () => {
    expect(sentence('Bonjour')).toBe('Bonjour.')
    expect(sentence('Bonjour. ')).toBe('Bonjour.')
    expect(sentence('stop, cédez-le-passage…')).toBe('stop, cédez-le-passage…')
    expect(sentence('Vraiment ?')).toBe('Vraiment ?')
  })

  it('gabarit A : image = panneau, bonne réponse = son nom', () => {
    for (const s of SIGNS) {
      for (const suffix of ['f', 'e']) {
        const q = byId.get(`pan_${s.id}_${suffix}`)
        expect(q.image).toBe(s.id)
        expect(q.optionImages).toBeUndefined()
        expect(q.options.fr[q.correct]).toBe(s.name)
        expect(q.explanation.fr.startsWith(`${s.code} : `)).toBe(true)
      }
    }
  })

  it('gabarit B (inversé) : optionImages alignées sur les noms, pas d’image de question', () => {
    for (const s of SIGNS) {
      for (const suffix of ['fi', 'ei']) {
        const q = byId.get(`pan_${s.id}_${suffix}`)
        expect(q.image).toBeUndefined()
        expect(q.optionImages).toHaveLength(4)
        expect(q.question.fr).toContain(s.name)
        q.optionImages.forEach((id, i) => {
          expect(getSign(id).name).toBe(q.options.fr[i])
        })
        expect(q.optionImages[q.correct]).toBe(s.id)
      }
    }
  })

  it('gabarit C : 4 libellés de familles, la bonne = famille du panneau', () => {
    const labels = new Set(FAMILIES.map((f) => f.label))
    for (const s of SIGNS) {
      const q = byId.get(`pan_${s.id}_ff`)
      expect(q.difficulty).toBe('facile')
      expect(q.image).toBe(s.id)
      for (const o of q.options.fr) expect(labels.has(o)).toBe(true)
      expect(q.options.fr[q.correct]).toBe(FAMILIES.find((f) => f.id === s.family).label)
    }
  })

  it('facile : les intrus viennent d’autres familles quand c’est possible', () => {
    for (const s of SIGNS) {
      const q = byId.get(`pan_${s.id}_f`)
      const distractors = q.options.fr.filter((_, i) => i !== q.correct)
      const others = SIGNS.filter((x) => x.family !== s.family).length
      if (others >= 3) {
        for (const name of distractors) {
          const sign = SIGNS.find((x) => x.name === name)
          expect(sign.family).not.toBe(s.family)
        }
      }
    }
  })

  it('expert : les jumeaux documentés sont proposés en premier et cités dans l’explication', () => {
    for (const s of SIGNS) {
      const twins = TABLE[s.id] || []
      if (!twins.length) continue
      const expected = Math.min(3, twins.length)
      for (const suffix of ['e', 'ei']) {
        const q = byId.get(`pan_${s.id}_${suffix}`)
        const distractors = q.options.fr.filter((_, i) => i !== q.correct)
        const present = twins.filter((tw) => distractors.includes(getSign(tw.id).name))
        expect(present.length, `${q.id} devrait proposer ${expected} jumeau(x)`).toBe(expected)
        expect(q.explanation.fr).toContain('Ne pas confondre avec ')
      }
    }
  })

  it('expert sans piège documenté : intrus de la même famille, explication sans mention', () => {
    for (const s of SIGNS) {
      if (TABLE[s.id]) continue
      const q = byId.get(`pan_${s.id}_e`)
      expect(q.explanation.fr).not.toContain('Ne pas confondre')
      const sameFam = SIGNS.filter((x) => x.family === s.family && x.id !== s.id).length
      if (sameFam >= 3) {
        for (const name of q.options.fr.filter((_, i) => i !== q.correct)) {
          expect(SIGNS.find((x) => x.name === name).family).toBe(s.family)
        }
      }
    }
  })
})
