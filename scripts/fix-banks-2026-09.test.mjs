import { describe, it, expect } from 'vitest'
import { permuteOptions, majusculeInitiale, remplaceTiretLong, surTousLesTextes } from './fix-banks-2026-09.mjs'

const question = () => ({
  id: 'route_0001',
  category: 'code-route',
  difficulty: 'facile',
  question: { fr: 'Q', en: 'Q' },
  options: { fr: ['Bonne', 'Deux', 'Trois', 'Quatre'], en: ['Right', 'Two', 'Three', 'Four'] },
  optionImages: ['i0', 'i1', 'i2', 'i3'],
  correct: 0,
  explanation: { fr: 'x' },
})

describe('permuteOptions', () => {
  it('permute toutes les langues et optionImages ensemble, et recalcule correct', () => {
    const q = question()
    const p = permuteOptions(q)
    expect(p).not.toBe(q)
    expect(q.correct).toBe(0) // l original n est pas modifié
    expect(p.options.fr[p.correct]).toBe('Bonne')
    expect(p.options.en[p.correct]).toBe('Right')
    expect(p.optionImages[p.correct]).toBe('i0')
    // même permutation dans chaque langue
    p.options.fr.forEach((o, i) => {
      const origine = q.options.fr.indexOf(o)
      expect(p.options.en[i]).toBe(q.options.en[origine])
      expect(p.optionImages[i]).toBe(q.optionImages[origine])
    })
    expect([...p.options.fr].sort()).toEqual([...q.options.fr].sort())
  })

  it('est idempotente : rejouer sur le résultat ne change rien', () => {
    const p1 = permuteOptions(question())
    const p2 = permuteOptions(p1)
    expect(p2).toEqual(p1)
  })

  it('ne dépend pas de l ordre courant des options (ordre canonique)', () => {
    const q = question()
    const melangee = {
      ...q,
      options: { fr: ['Trois', 'Bonne', 'Quatre', 'Deux'], en: ['Three', 'Right', 'Four', 'Two'] },
      optionImages: ['i2', 'i0', 'i3', 'i1'],
      correct: 1,
    }
    expect(permuteOptions(melangee)).toEqual(permuteOptions(q))
  })

  it('dépend de l id (deux questions identiques ne se rangent pas pareil)', () => {
    const ordres = new Set()
    for (let i = 0; i < 12; i++) {
      const p = permuteOptions({ ...question(), id: `route_00${String(i).padStart(2, '0')}` })
      ordres.add(p.options.fr.join('|'))
    }
    expect(ordres.size).toBeGreaterThan(1)
  })

  it('répartit correct sur les quatre index à peu près uniformément', () => {
    const comptes = [0, 0, 0, 0]
    for (let i = 0; i < 400; i++) {
      comptes[permuteOptions({ ...question(), id: `culture_${String(i).padStart(4, '0')}` }).correct]++
    }
    comptes.forEach((n) => expect(n).toBeGreaterThan(60))
  })

  it('laisse intacte une question mal formée', () => {
    const q = { id: 'x', options: { fr: ['a'] }, correct: 0 }
    expect(permuteOptions(q)).toBe(q)
  })
})

describe('majusculeInitiale', () => {
  it('met la première lettre en majuscule', () => {
    expect(majusculeInitiale('le Nen')).toBe('Le Nen')
    expect(majusculeInitiale("l'Hiraishin")).toBe("L'Hiraishin")
    expect(majusculeInitiale('électrik')).toBe('Électrik')
  })

  it('ne touche ni aux chiffres, ni aux symboles, ni aux marques à casse mixte', () => {
    expect(majusculeInitiale('50 km/h')).toBe('50 km/h')
    expect(majusculeInitiale('« Vers l infini »')).toBe('« Vers l infini »')
    expect(majusculeInitiale('eXistenZ')).toBe('eXistenZ')
    expect(majusculeInitiale('iPhone')).toBe('iPhone')
    expect(majusculeInitiale('Déjà')).toBe('Déjà')
    expect(majusculeInitiale('')).toBe('')
  })
})

describe('remplaceTiretLong', () => {
  it('deux-points dans un titre, virgule ailleurs', () => {
    expect(remplaceTiretLong('Up — Altas Aventuras', { titre: true })).toBe('Up: Altas Aventuras')
    expect(remplaceTiretLong('Quem dirigiu «E.T. — O Extraterrestre»?')).toBe('Quem dirigiu «E.T.: O Extraterrestre»?')
    expect(remplaceTiretLong('The friends wake up with no memory of the night — or of the groom.')).toBe(
      'The friends wake up with no memory of the night, or of the groom.',
    )
    expect(remplaceTiretLong('très peu — ce qui a fait la tension')).toBe('très peu, ce qui a fait la tension')
    expect(remplaceTiretLong('titre "A — B" puis — suite')).toBe('titre "A: B" puis, suite')
  })

  it('ne modifie pas un texte sans tiret long', () => {
    expect(remplaceTiretLong('Rien à voir - ici')).toBe('Rien à voir - ici')
  })
})

describe('surTousLesTextes', () => {
  it('visite question, explication et options dans toutes les langues', () => {
    const q = question()
    const vus = []
    surTousLesTextes(q, (t, { option }) => {
      vus.push(option)
      return t + '!'
    })
    expect(q.question.fr).toBe('Q!')
    expect(q.explanation.fr).toBe('x!')
    expect(q.options.en[3]).toBe('Four!')
    expect(vus.filter((o) => o).length).toBe(8)
    expect(vus.filter((o) => !o).length).toBe(3)
  })
})
