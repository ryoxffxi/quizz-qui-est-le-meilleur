// Tests de i18n-check.mjs sur des sources et des dictionnaires fictifs.
import { describe, expect, it } from 'vitest'
import {
  PREFIXES_DYNAMIQUES,
  extraireAppels,
  extraireLitteraux,
  verifier,
  verifierLegal,
} from './i18n-check.mjs'

const DASH = '—'

// Dictionnaire à parité, sans défaut : base des cas ci-dessous.
function dictSain() {
  return {
    fr: { close: 'Fermer', hello: 'Salut {name}', diff_facile: 'Facile' },
    en: { close: 'Close', hello: 'Hi {name}', diff_facile: 'Easy' },
    es: { close: 'Cerrar', hello: 'Hola {name}', diff_facile: 'Fácil' },
    pt: { close: 'Fechar', hello: 'Oi {name}', diff_facile: 'Fácil' },
  }
}

function appel(cle, ligne = 1) {
  return { cle, fichier: 'src/x.jsx', ligne }
}

describe('extraireAppels', () => {
  it('lit les littéraux simples de t() et tn(), avec le numéro de ligne', () => {
    const src = `const a = t('close')\nconst b = tn('streak_days', n)\nx = t("home", { n })`
    const { appels } = extraireAppels(src, 'f.jsx')
    expect(appels).toEqual([
      { cle: 'close', fichier: 'f.jsx', ligne: 1 },
      { cle: 'streak_days', fichier: 'f.jsx', ligne: 2 },
      { cle: 'home', fichier: 'f.jsx', ligne: 3 },
    ])
  })

  it('lit toutes les branches d’un ternaire ou d’un repli, sans toucher aux variables', () => {
    const src = `t(rounds === 1 ? 'rounds_count_one' : 'rounds_count', { n: rounds, label: 'pas_une_cle' })`
    const cles = extraireAppels(src).appels.map((a) => a.cle)
    expect(cles).toEqual(['rounds_count_one', 'rounds_count'])
    expect(extraireAppels(`t(key || 'fallback')`).appels.map((a) => a.cle)).toEqual(['fallback'])
  })

  it('suit un appel sur plusieurs lignes avec parenthèses imbriquées', () => {
    const src = `label={t(\n  ok ? 'exam_passed' : 'exam_failed',\n  { pct: Math.round((a / b) * 100) },\n)}`
    expect(extraireAppels(src).appels.map((a) => a.cle)).toEqual(['exam_passed', 'exam_failed'])
  })

  it('ignore les identifiants et signale le préfixe des gabarits', () => {
    const src = 't(category.labelKey)\nt(`diff_${d}`)\nt(`${dyn}`)'
    const { appels, prefixes } = extraireAppels(src, 'g.jsx')
    expect(appels).toEqual([])
    expect(prefixes).toEqual([
      { prefixe: 'diff_', fichier: 'g.jsx', ligne: 2 },
      { prefixe: '', fichier: 'g.jsx', ligne: 3 },
    ])
  })

  it('ne confond pas t( avec d’autres fonctions', () => {
    const src = `split('a'); wait('b'); format('c'); obj.t('d'); x.at('e'); $t('f')`
    // obj.t( est un appel de méthode, pas notre t() ; $t( non plus.
    expect(extraireAppels(src).appels.map((a) => a.cle)).toEqual([])
  })

  it('ne se laisse pas piéger par une parenthèse dans une chaîne', () => {
    const src = `t('a', { x: ')' }); t('b')`
    expect(extraireAppels(src).appels.map((a) => a.cle)).toEqual(['a', 'b'])
  })
})

describe('extraireLitteraux', () => {
  it('récolte les littéraux qui ressemblent à une clé', () => {
    const set = extraireLitteraux(`const K = { ok: 'daily_shared', ko: "daily_copied" }; x = \`solo_again\`; y = 'pas une clé'`)
    expect([...set]).toEqual(['daily_shared', 'daily_copied', 'solo_again'])
  })
})

describe('verifier', () => {
  it('ne signale rien sur un dictionnaire sain et entièrement utilisé', () => {
    const r = verifier({
      sources: { principal: dictSain() },
      appels: [appel('close'), appel('hello')],
    })
    expect(r.erreurs).toEqual([])
    expect(r.avertissements).toEqual([])
    expect(r.stats).toEqual({ sources: 1, cles: 3, appels: 2 })
  })

  it('a. clé appelée mais absente = erreur avec fichier:ligne', () => {
    const r = verifier({ sources: { principal: dictSain() }, appels: [appel('paywall_close', 85)] })
    expect(r.erreurs).toEqual(['clé manquante « paywall_close » appelée dans src/x.jsx:85'])
  })

  it('b. parité : clé manquante ou en trop dans une langue = erreur', () => {
    const d = dictSain()
    delete d.es.hello
    d.pt.extra = 'x'
    const r = verifier({ sources: { principal: d }, appels: [appel('close'), appel('hello')] })
    expect(r.erreurs).toEqual([
      'principal : clé « hello » manque en es',
      'principal : clé « extra » en pt n\'existe pas en fr',
    ])
  })

  it('b. langue absente = erreur', () => {
    const d = dictSain()
    delete d.pt
    const r = verifier({ sources: { principal: d }, appels: [appel('close'), appel('hello')] })
    expect(r.erreurs).toContain('principal : langue « pt » absente')
  })

  it('c. placeholders différents = erreur', () => {
    const d = dictSain()
    d.en.hello = 'Hi {nom}'
    const r = verifier({ sources: { principal: d }, appels: [appel('close'), appel('hello')] })
    expect(r.erreurs).toEqual([
      'principal : placeholders de « hello » différents en en ({nom} vs fr {name})',
    ])
  })

  it('d. tiret long = erreur, dans n’importe quelle langue', () => {
    const d = dictSain()
    d.pt.close = `Fechar ${DASH} agora`
    const r = verifier({ sources: { principal: d }, appels: [appel('close'), appel('hello')] })
    expect(r.erreurs).toEqual(['principal : tiret long (U+2014) dans « close » (pt)'])
  })

  it('valeur non textuelle = erreur', () => {
    const d = dictSain()
    d.fr.close = { nested: true }
    const r = verifier({ sources: { principal: d }, appels: [appel('close'), appel('hello')] })
    expect(r.erreurs).toContain('principal : « close » (fr) n\'est pas une chaîne')
  })

  it('e. clé jamais utilisée = avertissement, sauf préfixe dynamique ou littéral ailleurs', () => {
    const d = dictSain()
    d.fr.orpheline = 'x'
    d.en.orpheline = 'x'
    d.es.orpheline = 'x'
    d.pt.orpheline = 'x'
    d.fr.via_table = 'y'
    d.en.via_table = 'y'
    d.es.via_table = 'y'
    d.pt.via_table = 'y'
    const r = verifier({
      sources: { principal: d },
      appels: [appel('close'), appel('hello')],
      litteraux: new Set(['via_table']),
    })
    expect(r.erreurs).toEqual([])
    // diff_facile est couverte par le préfixe « diff_ », via_table par un littéral.
    expect(r.avertissements).toEqual(['clé jamais utilisée « orpheline » (principal)'])
  })

  it('f. clé définie dans le principal et dans un part = erreur', () => {
    const part = {
      fr: { close: 'Fermer', exam_title: 'Examen' },
      en: { close: 'Close', exam_title: 'Exam' },
      es: { close: 'Cerrar', exam_title: 'Examen' },
      pt: { close: 'Fechar', exam_title: 'Simulado' },
    }
    const r = verifier({
      sources: { principal: dictSain(), 'parts/exam.js': part },
      appels: [appel('close'), appel('hello'), appel('exam_title')],
    })
    expect(r.erreurs).toEqual(['clé « close » définie deux fois : principal et parts/exam.js'])
  })

  it('préfixe dynamique inconnu = avertissement, connu = silence', () => {
    const r = verifier({
      sources: { principal: dictSain() },
      appels: [appel('close'), appel('hello')],
      prefixesDynamiquesAppeles: [
        { prefixe: 'diff_', fichier: 'a.jsx', ligne: 3 },
        { prefixe: 'zzz_', fichier: 'b.jsx', ligne: 9 },
        { prefixe: '', fichier: 'c.jsx', ligne: 1 },
      ],
    })
    expect(r.avertissements).toEqual([
      'préfixe dynamique « zzz_… » (b.jsx:9) absent de PREFIXES_DYNAMIQUES',
    ])
  })

  it('les préfixes dynamiques du dépôt couvrent les clés assemblées connues', () => {
    for (const p of ['diff_', 'personality_', 'cat_', 'card_mode_', 'rounds_', 'theme_']) {
      expect(PREFIXES_DYNAMIQUES).toContain(p)
    }
  })
})

describe('verifierLegal', () => {
  function legalSain() {
    const doc = (t) => ({ title: t, updated: '2026-09-07', sections: [['A', 'a'], ['B', ['b1', 'b2']]] })
    return {
      privacy: { fr: doc('Confidentialité'), en: doc('Privacy'), es: doc('Privacidad'), pt: doc('Privacidade') },
    }
  }

  it('accepte une structure complète', () => {
    expect(verifierLegal(legalSain())).toEqual([])
  })

  it('refuse une langue absente, une date non ISO, un nombre de sections différent, un tiret long, du HTML', () => {
    const l = legalSain()
    delete l.privacy.pt
    l.privacy.en.updated = 'Last updated: 2026-09-07'
    l.privacy.es.sections = [['A', `a ${DASH} b`]]
    l.privacy.fr.sections[0][1] = 'texte <b>gras</b>'
    const erreurs = verifierLegal(l)
    expect(erreurs).toEqual([
      'legal.privacy.fr : section 1 contient du HTML',
      'legal.privacy.en : updated doit être une date ISO (AAAA-MM-JJ)',
      'legal.privacy.es : 1 section(s) au lieu de 2 (fr)',
      'legal.privacy.es : tiret long (U+2014)',
      'legal.privacy : langue « pt » absente',
    ])
  })

  it('refuse une section mal formée', () => {
    const l = legalSain()
    l.privacy.fr.sections[1] = ['Titre', '']
    expect(verifierLegal(l)).toEqual(['legal.privacy.fr : section 2 doit être [titre, paragraphe]'])
  })
})
