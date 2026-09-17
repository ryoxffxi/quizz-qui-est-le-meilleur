// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildShareText, emojiGrid, isTouchDevice, shareOrCopy } from './share'

// Redéfinit une propriété de navigator / document le temps d'un test.
const patched = []
function patch(obj, prop, value) {
  const desc = Object.getOwnPropertyDescriptor(obj, prop)
  patched.push(() => {
    if (desc) Object.defineProperty(obj, prop, desc)
    else delete obj[prop]
  })
  Object.defineProperty(obj, prop, { value, configurable: true, writable: true })
}

afterEach(() => {
  while (patched.length) patched.pop()()
  vi.restoreAllMocks()
})

const URL_ = 'https://quizz.test/#defi=abc'
const TEXT = `Alex te défie en Code de la route, 3 manches. Tu fais mieux que 9 000 pts ? ${URL_}`

describe('emojiGrid', () => {
  it('🟩 pour juste, 🟥 pour faux, retour à la ligne toutes les 10', () => {
    const results = Array.from({ length: 12 }, (_, i) => i % 3 !== 2)
    expect(emojiGrid(results)).toBe('🟩🟩🟥🟩🟩🟥🟩🟩🟥🟩\n🟩🟥')
  })

  it('grille vide pour aucun résultat', () => {
    expect(emojiGrid([])).toBe('')
  })

  it('accepte une autre largeur de ligne', () => {
    expect(emojiGrid([true, false, true, true], 2)).toBe('🟩🟥\n🟩🟩')
  })
})

describe('buildShareText', () => {
  it('assemble titre, score, grille et lien sur des lignes séparées', () => {
    expect(
      buildShareText({ title: 'Mon score', score: 7, total: 10, grid: '🟩🟥', url: URL_ }),
    ).toBe(`Mon score\n7/10\n🟩🟥\n${URL_}`)
  })

  it('omet les parties absentes, score seul sans total', () => {
    expect(buildShareText({ title: 'T', score: 3450, url: URL_ })).toBe(`T\n3450\n${URL_}`)
    expect(buildShareText({ url: URL_ })).toBe(URL_)
    expect(buildShareText()).toBe('')
  })
})

describe('shareOrCopy', () => {
  it('tactile + navigator.share : feuille native, lien passé à part (pas en double)', async () => {
    patch(navigator, 'maxTouchPoints', 5)
    const share = vi.fn().mockResolvedValue()
    patch(navigator, 'share', share)
    expect(isTouchDevice()).toBe(true)
    await expect(shareOrCopy({ url: URL_, text: TEXT, title: 'Quizz' })).resolves.toBe('shared')
    expect(share).toHaveBeenCalledTimes(1)
    const data = share.mock.calls[0][0]
    expect(data.url).toBe(URL_)
    expect(data.title).toBe('Quizz')
    expect(data.text).not.toContain(URL_)
    expect(data.text).toContain('Alex te défie')
  })

  it('feuille refermée par l’utilisateur (AbortError) : failed, sans copier', async () => {
    patch(navigator, 'maxTouchPoints', 5)
    const err = new Error('annulé')
    err.name = 'AbortError'
    patch(navigator, 'share', vi.fn().mockRejectedValue(err))
    const writeText = vi.fn().mockResolvedValue()
    patch(navigator, 'clipboard', { writeText })
    await expect(shareOrCopy({ url: URL_, text: TEXT })).resolves.toBe('failed')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('feuille en échec (autre erreur) : repli sur le presse-papiers', async () => {
    patch(navigator, 'maxTouchPoints', 5)
    patch(navigator, 'share', vi.fn().mockRejectedValue(new Error('boom')))
    const writeText = vi.fn().mockResolvedValue()
    patch(navigator, 'clipboard', { writeText })
    await expect(shareOrCopy({ url: URL_, text: TEXT })).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith(TEXT)
  })

  it('ordinateur (non tactile) : presse-papiers même si navigator.share existe', async () => {
    patch(navigator, 'maxTouchPoints', 0)
    const share = vi.fn().mockResolvedValue()
    patch(navigator, 'share', share)
    const writeText = vi.fn().mockResolvedValue()
    patch(navigator, 'clipboard', { writeText })
    await expect(shareOrCopy({ url: URL_, text: 'Salut' })).resolves.toBe('copied')
    expect(share).not.toHaveBeenCalled()
    // Texte sans le lien : le lien est ajouté sur sa propre ligne.
    expect(writeText).toHaveBeenCalledWith(`Salut\n${URL_}`)
  })

  it('presse-papiers refusé : repli textarea + execCommand', async () => {
    patch(navigator, 'maxTouchPoints', 0)
    patch(navigator, 'clipboard', { writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    const exec = vi.fn().mockReturnValue(true)
    patch(document, 'execCommand', exec)
    await expect(shareOrCopy({ url: URL_, text: TEXT })).resolves.toBe('copied')
    expect(exec).toHaveBeenCalledWith('copy')
    // Le textarea temporaire est retiré.
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('aucun mécanisme disponible, ou rien à partager : failed', async () => {
    patch(navigator, 'maxTouchPoints', 0)
    patch(navigator, 'clipboard', undefined)
    patch(document, 'execCommand', undefined)
    await expect(shareOrCopy({ url: URL_, text: TEXT })).resolves.toBe('failed')
    patch(navigator, 'clipboard', { writeText: vi.fn().mockResolvedValue() })
    await expect(shareOrCopy({})).resolves.toBe('failed')
  })
})
