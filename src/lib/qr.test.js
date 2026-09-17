import { describe, expect, it } from 'vitest'
import { alignmentPositions, qrMatrix, qrSvgPath } from './qr'

// Lit l'information de format (15 bits, copie du coin haut-gauche) et vérifie
// son code BCH : niveau L (01) + masque annoncé.
function readFormat(qr) {
  const m = qr.modules
  const bits = []
  for (let i = 0; i <= 5; i++) bits[i] = m[i][8]
  bits[6] = m[7][8]
  bits[7] = m[8][8]
  bits[8] = m[8][7]
  for (let i = 9; i < 15; i++) bits[i] = m[8][14 - i]
  let value = 0
  bits.forEach((b, i) => {
    if (b) value |= 1 << i
  })
  value ^= 0x5412
  const data = value >>> 10
  let rem = data
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
  return { level: data >>> 3, mask: data & 7, bchOk: (value & 0x3ff) === rem }
}

// Motif de repérage 7×7 (bordure sombre, anneau clair, cœur 3×3 sombre).
function finderOk(m, x0, y0) {
  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      const dist = Math.max(Math.abs(dx - 3), Math.abs(dy - 3))
      const expected = dist !== 2
      if (m[y0 + dy][x0 + dx] !== expected) return false
    }
  }
  return true
}

describe('qrMatrix (mode octets, niveau L)', () => {
  it('texte court → version 1, 21 modules, motifs de repérage aux trois coins', () => {
    const qr = qrMatrix('HELLO WORLD')
    expect(qr.version).toBe(1)
    expect(qr.size).toBe(21)
    expect(qr.modules).toHaveLength(21)
    expect(finderOk(qr.modules, 0, 0)).toBe(true)
    expect(finderOk(qr.modules, 14, 0)).toBe(true)
    expect(finderOk(qr.modules, 0, 14)).toBe(true)
    // Motifs de synchronisation (ligne et colonne 6 : alternance) et module sombre.
    for (let i = 8; i < 13; i++) {
      expect(qr.modules[6][i]).toBe(i % 2 === 0)
      expect(qr.modules[i][6]).toBe(i % 2 === 0)
    }
    expect(qr.modules[qr.size - 8][8]).toBe(true)
  })

  it('l’information de format est cohérente (BCH valide, niveau L, masque choisi)', () => {
    for (const text of ['A', 'HELLO WORLD', 'https://quizz.example/#resultat=' + 'x'.repeat(200)]) {
      const qr = qrMatrix(text)
      const fmt = readFormat(qr)
      expect(fmt.bchOk).toBe(true)
      expect(fmt.level).toBe(1)
      expect(fmt.mask).toBe(qr.mask)
    }
  })

  it('la version suit la longueur (capacités du niveau L) ; trop long → null', () => {
    expect(qrMatrix('x'.repeat(17)).version).toBe(1) // 17 octets max en v1
    expect(qrMatrix('x'.repeat(18)).version).toBe(2)
    const url = qrMatrix('https://quizz.example/#resultat=' + 'x'.repeat(220))
    expect(url.version).toBeLessThanOrEqual(12)
    expect(url.size).toBe(url.version * 4 + 17)
    expect(qrMatrix('x'.repeat(2954))).toBeNull()
    expect(qrMatrix('x'.repeat(2953)).version).toBe(40)
  })

  it('même texte → même matrice (déterministe), textes différents → matrices différentes', () => {
    const a = qrMatrix('quizz')
    const b = qrMatrix('quizz')
    const c = qrMatrix('quizx')
    expect(a).toEqual(b)
    expect(a.modules).not.toEqual(c.modules)
  })

  it('positions des motifs d’alignement (norme)', () => {
    expect(alignmentPositions(1)).toEqual([])
    expect(alignmentPositions(2)).toEqual([6, 18])
    expect(alignmentPositions(7)).toEqual([6, 22, 38])
    expect(alignmentPositions(32)).toEqual([6, 34, 60, 86, 112, 138])
    expect(alignmentPositions(40)).toEqual([6, 30, 58, 86, 114, 142, 170])
  })

  it('les octets UTF-8 comptent (accents, emoji)', () => {
    // 'é' = 2 octets, '🟩' = 4 octets : 17 octets en tout tiennent en v1.
    expect(qrMatrix('é'.repeat(6) + '🟩').version).toBe(1)
    expect(qrMatrix('é'.repeat(7) + '🟩').version).toBe(2)
  })
})

describe('qrSvgPath', () => {
  it('renvoie la taille et un tracé d’un carré par module sombre', () => {
    const qr = qrMatrix('quizz')
    const svg = qrSvgPath('quizz')
    expect(svg.size).toBe(qr.size)
    const dark = qr.modules.flat().filter(Boolean).length
    expect(svg.d.match(/M\d+ \d+h1v1h-1z/g)).toHaveLength(dark)
    expect(svg.d.startsWith('M0 0h1v1h-1z')).toBe(true) // coin du motif de repérage
  })

  it('null quand le texte dépasse la capacité', () => {
    expect(qrSvgPath('x'.repeat(4000))).toBeNull()
  })
})
