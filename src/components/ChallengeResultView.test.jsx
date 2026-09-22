// @vitest-environment jsdom
// Page de conversion (lien #resultat=) : appels à l'action selon qui regarde
// (hôte reconnu par son pseudo → revanche ; inconnu → mêmes questions contre
// le gagnant), historique des duels mis à jour côté hôte.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LanguageProvider } from '../i18n'
import ChallengeResultView from './ChallengeResultView'
import { findDuel, setPseudo } from '../lib/duels'

vi.mock('../lib/sound', () => ({ sound: { select: vi.fn() } }))

// Sam (invité) renvoie son score à Alex (hôte) : p1 = Sam, p2 = Alex.
const duel = {
  c: 'code-route',
  d: 'facile',
  l: 'fr',
  n: 2,
  s: 4242,
  p1: 'Sam',
  r1: [3000, 2500],
  p2: 'Alex',
  r2: [2800, 2900],
}

function mount(result, extra = {}) {
  const onPlay = vi.fn()
  const onChallenge = vi.fn()
  const onJoin = vi.fn()
  render(
    <LanguageProvider>
      <ChallengeResultView
        result={result}
        onPlay={onPlay}
        onChallenge={onChallenge}
        onJoin={extra.noJoin ? undefined : onJoin}
      />
    </LanguageProvider>,
  )
  return { onPlay, onChallenge, onJoin }
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('quizzo_lang', 'fr')
})
afterEach(cleanup)

describe('ChallengeResultView', () => {
  it('visiteur inconnu : « joue les mêmes questions et bats {gagnant} » ouvre l’invitation', () => {
    const { onJoin } = mount(duel)
    expect(screen.getByText(/Alex l’emporte/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /bats Alex/ }))
    expect(onJoin).toHaveBeenCalledTimes(1)
    const { invite } = onJoin.mock.calls[0][0]
    // Le gagnant devient l'hôte du paquet : même graine, ses scores en repère.
    expect(invite).toEqual({ p: 'Alex', c: 'code-route', d: 'facile', s: 4242, n: 2, r: [2800, 2900], l: 'fr' })
  })

  it('sans graine (ancien lien) ou sans onJoin : pas de « mêmes questions », défi classique', () => {
    const old = { ...duel }
    delete old.s
    const a = mount(old)
    expect(screen.queryByRole('button', { name: /bats/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Défier un ami/ }))
    expect(a.onChallenge).toHaveBeenCalledWith({})
    cleanup()
    mount(duel, { noJoin: true })
    expect(screen.queryByRole('button', { name: /bats/ })).toBeNull()
  })

  it('l’hôte (pseudo = p2) voit « {p1} a relevé ton défi », une revanche, et le duel passe « répondu »', () => {
    setPseudo('Alex')
    const { onChallenge } = mount(duel)
    expect(screen.getByText('Sam a relevé ton défi !')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /bats/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Revanche contre Sam' }))
    expect(onChallenge).toHaveBeenCalledWith({ opponent: 'Sam', rounds: 2 })
    expect(findDuel(4242, 'code-route', 'facile')).toMatchObject({
      opponent: 'Sam',
      myScores: [2800, 2900],
      theirScores: [3000, 2500],
      status: 'answered',
    })
  })

  it('l’invité (pseudo = p1) relit son résultat : revanche contre l’hôte, historique intact', () => {
    setPseudo('Sam')
    const { onChallenge } = mount(duel)
    fireEvent.click(screen.getByRole('button', { name: 'Revanche contre Alex' }))
    expect(onChallenge).toHaveBeenCalledWith({ opponent: 'Alex', rounds: 2 })
    expect(findDuel(4242, 'code-route', 'facile')).toBeNull()
  })

  it('résultat solo : libellé du mode, grille, et appels à l’action classiques', () => {
    const { onPlay } = mount({ solo: 1, c: 'code-route', d: 'expert', sc: 36, tot: 40, mode: 'examen', grid: '🟩🟩🟥' })
    expect(screen.getByText(/EXAMEN BLANC · Expert/)).toBeTruthy()
    expect(screen.getByText('🟩🟩🟥')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Jouer maintenant' }))
    expect(onPlay).toHaveBeenCalledTimes(1)
  })

  it('résultat invalide (catégorie inconnue) : message et retour à l’accueil', () => {
    const { onPlay } = mount({ ...duel, c: 'inconnue' })
    expect(screen.getByText(/Lien de résultat invalide/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Accueil' }))
    expect(onPlay).toHaveBeenCalledTimes(1)
  })
})
