// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import Segmented from './Segmented'

vi.mock('../lib/sound', () => ({ sound: { select: vi.fn() } }))

afterEach(cleanup)

const OPTIONS = [
  { value: 'solo', label: 'Solo' },
  { value: 'challenge', label: 'Défi' },
  { value: 'exam', label: 'Examen' },
]

function setup(value = 'solo') {
  const onChange = vi.fn()
  const utils = render(
    <Segmented options={OPTIONS} value={value} onChange={onChange} label="Mode" />,
  )
  const radios = utils.getAllByRole('radio')
  return { ...utils, onChange, radios }
}

describe('Segmented', () => {
  it('expose un groupe de boutons radio, un seul coché et tabulable', () => {
    const { getByRole, radios } = setup('challenge')
    expect(getByRole('radiogroup').getAttribute('aria-label')).toBe('Mode')
    expect(radios).toHaveLength(3)
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true', 'false'])
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1])
    expect(radios[1].className).toContain('active')
  })

  it('un clic change la valeur (et ne rappelle pas onChange sur la valeur courante)', () => {
    const { onChange, radios } = setup('solo')
    fireEvent.click(radios[0])
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(radios[2])
    expect(onChange).toHaveBeenCalledWith('exam')
  })

  it('les flèches font tourner la sélection et déplacent le focus', () => {
    const { onChange, radios } = setup('solo')
    radios[0].focus()
    fireEvent.keyDown(radios[0], { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('challenge')
    expect(document.activeElement).toBe(radios[1])
    fireEvent.keyDown(radios[0], { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('exam')
    expect(document.activeElement).toBe(radios[2])
  })

  it('Début et Fin sautent aux extrémités', () => {
    const { onChange, radios } = setup('challenge')
    fireEvent.keyDown(radios[1], { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith('exam')
    fireEvent.keyDown(radios[1], { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith('solo')
  })
})
