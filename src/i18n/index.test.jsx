// @vitest-environment jsdom
// Helpers i18n (pluriels, formats, langue initiale) et contexte du fournisseur.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'

// Lien ouvert (défi / résultat) : contrôlé par le test.
const lien = { valeur: null }
vi.mock('../lib/challengeLink', () => ({
  readChallengeFromUrl: () => lien.valeur,
  readResultFromUrl: () => null,
}))

const i18n = await import('./index.jsx')
const { LANGUAGES, LOCALES, LanguageProvider, detectInitialLang, fmtCurrency, fmtDate, fmtNumber, fmtTime, tn, translate, useI18n } = i18n

// Espace insécable fin (U+202F) et insécable (U+00A0) : Intl en français.
const norm = (s) => s.replace(/[\u202F\u00A0]/g, ' ')

beforeEach(() => {
  localStorage.clear()
  lien.valeur = null
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('LANGUAGES / LOCALES', () => {
  it('le portugais est brésilien et chaque langue a sa locale', () => {
    const pt = LANGUAGES.find((l) => l.code === 'pt')
    expect(pt).toEqual({ code: 'pt', flag: '🇧🇷', label: 'Português (Brasil)' })
    expect(LOCALES).toEqual({ fr: 'fr-FR', en: 'en-US', es: 'es-ES', pt: 'pt-BR' })
    expect(Object.keys(LOCALES)).toEqual(LANGUAGES.map((l) => l.code))
  })
})

describe('translate / tn', () => {
  it('replie sur le français puis sur la clé', () => {
    expect(translate('close', null, 'en')).toBe('Close')
    expect(translate('inconnue_xyz', null, 'en')).toBe('inconnue_xyz')
    expect(translate('recap_title', { n: 3 }, 'fr')).toBe('Tes erreurs (3)')
  })

  it('choisit clé_one / clé (pluriel) selon la langue et injecte {n}', () => {
    expect(tn('streak_days', 1, null, 'fr')).toBe('1 jour de suite')
    expect(tn('streak_days', 5, null, 'fr')).toBe('5 jours de suite')
    expect(tn('streak_days', 1, null, 'en')).toBe('1 day in a row')
    expect(tn('streak_days', 0, null, 'en')).toBe('0 days in a row')
    expect(tn('streak_days', 2, null, 'pt')).toBe('2 dias seguidos')
  })

  it('accepte des variables supplémentaires et une clé sans variante', () => {
    expect(tn('rounds_help', 1, { q: 5 }, 'fr')).toBe('1 manche · 5 questions, toutes différentes')
    expect(tn('rounds_help', 3, { q: 15 }, 'fr')).toBe('3 manches · 15 questions, toutes différentes')
    expect(tn('questions_count', 2140, null, 'en')).toBe('2,140 questions')
  })
})

describe('formats', () => {
  it('fmtNumber suit la locale', () => {
    expect(norm(fmtNumber(2140, 'fr'))).toBe('2 140')
    expect(fmtNumber(2140, 'en')).toBe('2,140')
    expect(fmtNumber('abc', 'fr')).toBe('abc')
  })

  it('fmtCurrency formate des euros, sans décimales inutiles', () => {
    expect(norm(fmtCurrency(2, 'fr'))).toBe('2 €')
    expect(norm(fmtCurrency(9.99, 'fr'))).toBe('9,99 €')
    expect(fmtCurrency(2, 'en')).toBe('€2')
    expect(fmtCurrency(9.99, 'en')).toBe('€9.99')
    expect(norm(fmtCurrency(2, 'pt'))).toBe('€ 2')
  })

  it('fmtDate rend une date ISO dans la langue, sans recul de jour', () => {
    expect(fmtDate('2026-09-07', 'long', 'fr')).toBe('7 septembre 2026')
    expect(fmtDate('2026-09-07', 'long', 'en')).toBe('September 7, 2026')
    expect(fmtDate('2026-09-07', 'short', 'en')).toBe('9/7/26')
    expect(fmtDate('n’importe quoi', 'long', 'fr')).toBe('n’importe quoi')
    expect(fmtDate('', 'long', 'fr')).toBe('')
  })

  it('fmtTime rend m:ss puis h:mm:ss', () => {
    expect(fmtTime(0)).toBe('0:00')
    expect(fmtTime(65)).toBe('1:05')
    expect(fmtTime(599.9)).toBe('9:59')
    expect(fmtTime(3661)).toBe('1:01:01')
    expect(fmtTime(-4)).toBe('0:00')
    expect(fmtTime(NaN)).toBe('0:00')
  })
})

describe('detectInitialLang', () => {
  it('ordre : localStorage > lien > navigateur > fr', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('es-ES')
    expect(detectInitialLang()).toBe('es')
    lien.valeur = { l: 'pt' }
    expect(detectInitialLang()).toBe('pt')
    localStorage.setItem('quizzo_lang', 'en')
    expect(detectInitialLang()).toBe('en')
  })

  it('ignore une langue inconnue et retombe sur le français', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('de-DE')
    localStorage.setItem('quizzo_lang', 'xx')
    lien.valeur = { l: 'zz' }
    expect(detectInitialLang()).toBe('fr')
  })
})

describe('LanguageProvider', () => {
  it('expose t, tn et les formats liés à la langue courante, et synchronise le DOM', () => {
    localStorage.setItem('quizzo_lang', 'en')
    let ctx
    function Sonde() {
      ctx = useI18n()
      return null
    }
    render(
      <LanguageProvider>
        <Sonde />
      </LanguageProvider>,
    )
    expect(ctx.lang).toBe('en')
    expect(ctx.locale).toBe('en-US')
    expect(ctx.t('close')).toBe('Close')
    expect(ctx.tn('streak_days', 1)).toBe('1 day in a row')
    expect(ctx.fmtNumber(1234)).toBe('1,234')
    expect(ctx.fmtCurrency(2)).toBe('€2')
    expect(ctx.fmtDate('2026-09-07')).toBe('September 7, 2026')
    expect(ctx.fmtTime(90)).toBe('1:30')
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('Quizz - Who’s the best?')

    act(() => ctx.setLang('fr'))
    expect(ctx.lang).toBe('fr')
    expect(ctx.t('close')).toBe('Fermer')
    expect(localStorage.getItem('quizzo_lang')).toBe('fr')
    expect(document.documentElement.lang).toBe('fr')
    expect(i18n.getLang()).toBe('fr')
  })
})
