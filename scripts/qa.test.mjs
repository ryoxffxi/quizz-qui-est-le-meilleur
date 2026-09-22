import { describe, it, expect } from 'vitest'
import {
  normalise,
  motsCles,
  jaccard,
  bonneReponse,
  doublonsSemantiques,
  reponseDansEnonce,
  optionLaPlusLongue,
  distributionCorrect,
  clesInconnues,
  tiretLong,
  incoherenceFrEn,
  hashString,
  mulberry32,
  CLES_CONNUES,
} from './lib/qa.mjs'

// Fabrique une question minimale (FR seul par défaut).
function q(id, fr, options, correct = 0, extra = {}) {
  return {
    id,
    category: 'test',
    difficulty: 'facile',
    question: { fr },
    options: { fr: options },
    correct,
    explanation: { fr: 'x' },
    ...extra,
  }
}

describe('normalise / motsCles / jaccard', () => {
  it('met en minuscules, retire accents et ponctuation', () => {
    expect(normalise('  Quelle est la Capitale ?! ')).toBe('quelle est la capitale')
    expect(normalise('Élève, où ?')).toBe('eleve ou')
    expect(normalise(null)).toBe('')
  })

  it('garde les mots-clés et jette les mots vides et le vocabulaire de quiz', () => {
    const mots = motsCles('Quel film a réalisé Steven Spielberg en 1993 ?')
    expect(mots).toEqual(new Set(['steven', 'spielberg', '1993']))
  })

  it('jaccard : 1 pour identiques, 0 pour disjoints ou vides', () => {
    expect(jaccard(['a', 'b'], ['a', 'b'])).toBe(1)
    expect(jaccard(['a'], ['b'])).toBe(0)
    expect(jaccard([], [])).toBe(0)
    expect(jaccard(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd']))).toBeCloseTo(0.5)
  })

  it('bonneReponse renvoie le texte de l option correcte', () => {
    expect(bonneReponse(q('x', 'Q', ['A', 'B', 'C', 'D'], 2))).toBe('C')
    expect(bonneReponse({ options: {} })).toBeNull()
  })
})

describe('doublonsSemantiques', () => {
  const opts = ['Au moins 2 secondes', '1 seconde', '5 secondes', '10 secondes']
  it('repère deux énoncés qui se recoupent avec la même bonne réponse', () => {
    const banque = [
      q('a', 'Quelle distance de sécurité minimale faut-il garder derrière un véhicule ?', opts, 0),
      q('b', 'Quel intervalle de sécurité minimal respecter derrière le véhicule qui précède ?', opts, 0),
      q('c', 'Combien de cordes a un violon ?', ['4', '5', '6', '7'], 0),
    ]
    const paires = doublonsSemantiques(banque)
    expect(paires).toHaveLength(1)
    expect(paires[0]).toMatchObject({ a: 'a', b: 'b', raison: 'mots-cles' })
    expect(paires[0].score).toBeGreaterThanOrEqual(0.25)
  })

  it('signale « options » quand les 4 choix sont identiques avec un mot-clé commun mais peu de recoupement', () => {
    const opts = ['Au moins 2 secondes', '1 seconde', '5 secondes', '10 secondes']
    const banque = [
      q('a', 'Quelle distance de sécurité minimale faut-il garder ?', opts, 0),
      q('b', 'Quel intervalle de sécurité minimal respecter derrière un véhicule ?', opts, 0),
    ]
    const paires = doublonsSemantiques(banque)
    expect(paires).toHaveLength(1)
    expect(paires[0].raison).toBe('options')
    expect(paires[0].score).toBeLessThan(0.25)
  })

  it('compare la bonne réponse par son texte, pas par son index', () => {
    const banque = [
      q('a', 'Quel organe pompe le sang ?', ['Le cœur', 'Le foie', 'Le rein', 'Le poumon'], 0),
      q('b', 'Quel organe du corps humain pompe le sang ?', ['Le foie', 'Le cœur', 'Le rein', 'Le poumon'], 1),
    ]
    expect(doublonsSemantiques(banque)).toHaveLength(1)
  })

  it('mêmes options + même réponse ne suffisent pas sans mot-clé commun', () => {
    const noms = ['Steven Spielberg', 'George Lucas', 'James Cameron', 'Ridley Scott']
    const banque = [
      q('a', 'Qui a réalisé « E.T. » ?', noms, 0),
      q('b', 'Qui a réalisé « Jurassic Park » ?', noms, 0),
      q('c', 'Qui a réalisé « Jurassic Park » (1993) ?', noms, 0),
    ]
    const paires = doublonsSemantiques(banque)
    expect(paires.map((p) => `${p.a}/${p.b}`)).toEqual(['b/c'])
  })

  it('ignore les questions dont la bonne réponse diffère', () => {
    const banque = [
      q('a', 'Quelle couleur en mélangeant bleu et jaune ?', ['Vert', 'Violet', 'Orange', 'Gris'], 0),
      q('b', 'Quelle couleur en mélangeant bleu et rouge ?', ['Vert', 'Violet', 'Orange', 'Gris'], 1),
    ]
    expect(doublonsSemantiques(banque)).toHaveLength(0)
  })
})

describe('reponseDansEnonce', () => {
  it('attrape la réponse citée telle quelle dans l énoncé', () => {
    const question = q(
      'r',
      'Sur une route à double sens (généralement 80 km/h), quelle est la vitesse par temps de pluie ?',
      ['80 km/h', '70 km/h', '90 km/h', '60 km/h'],
    )
    expect(reponseDansEnonce(question)).toBe(true)
  })

  it('attrape les mots-clés de la réponse déjà tous présents', () => {
    const question = q(
      'm',
      'Comment s appelle le trésor que cherchent les pirates de « One Piece » ?',
      ['Le One Piece', 'Le Rio Poneglyph', 'Le Trident', 'L Eldorado'],
    )
    expect(reponseDansEnonce(question)).toBe(true)
    expect(reponseDansEnonce(q('t', 'Que combattent les humains dans « L Attaque des Titans » ?', ['Des Titans', 'Des dragons', 'Des démons', 'Des aliens']))).toBe(true)
  })

  it('ne se laisse pas piéger par une lettre, une élision ou un nombre isolé', () => {
    expect(reponseDansEnonce(q('v', 'Quelle vitamine fabrique-t-on grâce au soleil ?', ['La vitamine D', 'La vitamine C', 'La vitamine A', 'La vitamine K']))).toBe(false)
    expect(reponseDansEnonce(q('e', "Quel est le numéro de l'équipe de Naruto ?", ["L'équipe 7", "L'équipe 8", "L'équipe 10", "L'équipe 3"]))).toBe(false)
    expect(reponseDansEnonce(q('b', 'Quand la visibilité est inférieure à 50 m, quelle est la vitesse maximale ?', ['50 km/h', '30 km/h', '70 km/h', '80 km/h']))).toBe(false)
    expect(reponseDansEnonce(q('a', "En combien de temps élimine-t-on un verre d'alcool ?", ['Environ 1 à 2 heures', '10 minutes', '5 heures', '1 jour']))).toBe(false)
  })

  it('renvoie false sur une question incomplète', () => {
    expect(reponseDansEnonce({ question: { fr: 'x' } })).toBe(false)
  })

  it('exempte les questions à options illustrées (le nom de l image est dans l énoncé par construction)', () => {
    const question = q('p', 'Quel panneau signifie « Stop » ?', ['Stop', 'Cédez le passage', 'Sens interdit', 'Virage à droite'], 0, {
      optionImages: ['AB4', 'AB3a', 'B1', 'A1a'],
    })
    expect(reponseDansEnonce(question)).toBe(false)
    delete question.optionImages
    expect(reponseDansEnonce(question)).toBe(true)
  })
})

describe('statistiques de banque', () => {
  it('optionLaPlusLongue compte les bonnes options strictement plus longues', () => {
    const banque = [
      q('a', 'Q', ['Réponse très longue', 'a', 'b', 'c'], 0),
      q('b', 'Q', ['a', 'bb', 'ccc', 'dd'], 1),
      q('c', 'Q', ['aaa', 'bbb', 'c', 'd'], 0), // égalité : pas strictement la plus longue
    ]
    const stats = optionLaPlusLongue(banque)
    expect(stats).toMatchObject({ total: 3, plusLongue: 1, ids: ['a'] })
    expect(stats.ratio).toBeCloseTo(1 / 3)
  })

  it('distributionCorrect donne les comptes par index et la part maximale', () => {
    const banque = [q('a', 'Q', ['a', 'b', 'c', 'd'], 0), q('b', 'Q', ['a', 'b', 'c', 'd'], 0), q('c', 'Q', ['a', 'b', 'c', 'd'], 3), { correct: 9 }]
    expect(distributionCorrect(banque)).toEqual({ comptes: [2, 0, 0, 1], total: 3, indexMax: 0, partMax: 2 / 3 })
  })
})

describe('contrôles unitaires', () => {
  it('clesInconnues signale les champs hors liste blanche', () => {
    expect(clesInconnues(q('a', 'Q', ['a', 'b', 'c', 'd'], 0, { tier: 'free', theme: 'x' }))).toEqual(['tier'])
    expect(CLES_CONNUES).toContain('optionImages')
  })

  it('tiretLong renvoie les chemins fautifs dans toutes les langues', () => {
    const question = {
      question: { fr: 'ok', pt: 'E.T. — O Extraterrestre' },
      options: { fr: ['a', 'b — c', 'd', 'e'] },
      explanation: { en: 'no dash' },
    }
    expect(tiretLong(question)).toEqual(['question.pt', 'options.fr[1]'])
    expect(tiretLong(q('x', 'Q', ['a', 'b', 'c', 'd']))).toEqual([])
  })

  it('incoherenceFrEn compare nombres et négations', () => {
    const base = q('a', 'Quel anime tourne autour d une malédiction ?', ['a', 'b', 'c', 'd'])
    base.question.en = 'Which 2011 anime centres on a curse?'
    expect(incoherenceFrEn(base)).toMatch(/nombres différents/)

    const neg = q('b', "Quel personnage n'a jamais perdu ?", ['a', 'b', 'c', 'd'])
    neg.question.en = 'Which character always wins?'
    expect(incoherenceFrEn(neg)).toBe('négation en FR absente en EN')

    const ok = q('c', 'Quelle dynastie régnait au VIIe siècle ?', ['a', 'b', 'c', 'd'])
    ok.question.en = 'Which dynasty ruled in the 7th century?'
    expect(incoherenceFrEn(ok)).toBeNull()

    const titre = q('d', 'Quel studio a animé « Kimetsu no Yaiba » ?', ['a', 'b', 'c', 'd'])
    titre.question.en = 'Which studio animated "Kimetsu no Yaiba"?'
    expect(incoherenceFrEn(titre)).toBeNull()

    // « non » préfixe, « no » = « sans », romanisation hors guillemets : pas des négations
    const prefixe = q('f', 'Combien de jours compte février lors d une année non bissextile ?', ['a', 'b', 'c', 'd'])
    prefixe.question.en = 'How many days does February have in a non-leap year?'
    expect(incoherenceFrEn(prefixe)).toBeNull()
    const sans = q('g', 'Comment appelle-t-on un manga publié en une seule fois, sans suite ?', ['a', 'b', 'c', 'd'])
    sans.question.en = 'What is a manga published in one go, with no sequel, called?'
    expect(incoherenceFrEn(sans)).toBeNull()
    const romaji = q('h', 'Quel studio a animé A Silent Voice (Koe no Katachi) ?', ['a', 'b', 'c', 'd'])
    romaji.question.en = 'Which studio animated A Silent Voice (Koe no Katachi)?'
    expect(incoherenceFrEn(romaji)).toBeNull()

    expect(incoherenceFrEn(q('e', 'FR seul', ['a', 'b', 'c', 'd']))).toBeNull()
  })
})

describe('aléatoire déterministe', () => {
  it('hashString est un FNV-1a 32 bits stable', () => {
    expect(hashString('')).toBe(0x811c9dc5)
    expect(hashString('a')).toBe(0xe40c292c)
    expect(hashString('route_0001')).toBe(hashString('route_0001'))
    expect(hashString('route_0001')).not.toBe(hashString('route_0002'))
  })

  it('mulberry32 est reproductible et borné dans [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const suite = Array.from({ length: 5 }, () => a())
    expect(suite).toEqual(Array.from({ length: 5 }, () => b()))
    suite.forEach((x) => {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    })
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })
})
