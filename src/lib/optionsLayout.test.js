import { describe, expect, it } from 'vitest'
import { SHORT_OPTION_MAX, hasShortOptions, optionsGridClass } from './optionsLayout'

describe('hasShortOptions', () => {
  it('vrai quand toutes les options tiennent en 24 caractères', () => {
    expect(hasShortOptions(['Oui', 'Non', 'Parfois', 'Jamais'])).toBe(true)
    expect(hasShortOptions(['a'.repeat(SHORT_OPTION_MAX), 'b'])).toBe(true)
  })

  it('faux dès qu’une option dépasse, ou sans option', () => {
    expect(hasShortOptions(['Oui', 'a'.repeat(SHORT_OPTION_MAX + 1)])).toBe(false)
    expect(hasShortOptions([])).toBe(false)
    expect(hasShortOptions(undefined)).toBe(false)
  })

  it('ignore les espaces de bord et tolère une option vide', () => {
    expect(hasShortOptions(['  court  ', null])).toBe(true)
  })
})

describe('optionsGridClass', () => {
  it('« grid » pour des options courtes ou illustrées, sinon chaîne vide', () => {
    expect(optionsGridClass({ options: ['Stop', 'Céder', 'Interdit', 'Danger'] })).toBe('grid')
    expect(
      optionsGridClass({
        options: ['Un nom de panneau vraiment long', 'B', 'C', 'D'],
        optionImages: ['a1', 'a2', 'a3', 'a4'],
      }),
    ).toBe('grid')
    expect(optionsGridClass({ options: ['Un nom de panneau vraiment long', 'B'] })).toBe('')
    expect(optionsGridClass(null)).toBe('')
  })
})
