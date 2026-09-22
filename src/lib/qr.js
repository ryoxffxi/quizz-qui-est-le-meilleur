// Générateur de QR code minimal, sans dépendance : mode octets, correction
// d'erreurs de niveau L, versions 1 à 40, masque choisi par pénalité
// (règles 1, 2 et 4 de la norme, suffisant pour rester lisible). Sert à
// imprimer le lien de résultat sur la carte image (ISO/IEC 18004).

// Codewords de correction par bloc et nombre de blocs, niveau L, versions 1..40.
const ECC_PER_BLOCK = [
  7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28,
  28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
]
const BLOCKS = [
  1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8,
  8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
]

// Modules disponibles pour les données (hors motifs fonctionnels), par version.
function rawDataModules(ver) {
  let n = (16 * ver + 128) * ver + 64
  if (ver >= 2) {
    const align = Math.floor(ver / 7) + 2
    n -= (25 * align - 10) * align - 55
    if (ver >= 7) n -= 36
  }
  return n
}

function dataCodewords(ver) {
  return Math.floor(rawDataModules(ver) / 8) - ECC_PER_BLOCK[ver - 1] * BLOCKS[ver - 1]
}

// Positions des motifs d'alignement (centres), par version.
export function alignmentPositions(ver) {
  if (ver === 1) return []
  const count = Math.floor(ver / 7) + 2
  const size = ver * 4 + 17
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (count * 2 - 2)) * 2
  const out = [6]
  for (let pos = size - 7; out.length < count; pos -= step) out.splice(1, 0, pos)
  return out
}

// ===== Reed-Solomon sur GF(2^8), polynôme 0x11D =====
function gfMul(x, y) {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z & 0xff
}

function rsDivisor(degree) {
  const result = new Array(degree).fill(0)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j], root)
      if (j + 1 < degree) result[j] ^= result[j + 1]
    }
    root = gfMul(root, 2)
  }
  return result
}

function rsRemainder(data, divisor) {
  const result = new Array(divisor.length).fill(0)
  for (const b of data) {
    const factor = b ^ result.shift()
    result.push(0)
    divisor.forEach((coef, i) => {
      result[i] ^= gfMul(coef, factor)
    })
  }
  return result
}

// Découpe en blocs, ajoute la correction d'erreurs et entrelace les blocs.
function addEcc(data, ver) {
  const numBlocks = BLOCKS[ver - 1]
  const eccLen = ECC_PER_BLOCK[ver - 1]
  const rawCodewords = Math.floor(rawDataModules(ver) / 8)
  const numShort = numBlocks - (rawCodewords % numBlocks)
  const shortLen = Math.floor(rawCodewords / numBlocks)
  const divisor = rsDivisor(eccLen)
  const blocks = []
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const len = shortLen - eccLen + (i < numShort ? 0 : 1)
    const dat = data.slice(k, k + len)
    k += len
    const ecc = rsRemainder(dat, divisor)
    if (i < numShort) dat.push(0) // case vide pour aligner les blocs courts
    blocks.push(dat.concat(ecc))
  }
  const out = []
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortLen - eccLen || j >= numShort) out.push(block[i])
    })
  }
  return out
}

// ===== Matrice =====
class Matrix {
  constructor(size) {
    this.size = size
    this.modules = Array.from({ length: size }, () => new Array(size).fill(false))
    this.isFunction = Array.from({ length: size }, () => new Array(size).fill(false))
  }

  setFunction(x, y, dark) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return
    this.modules[y][x] = dark
    this.isFunction[y][x] = true
  }

  drawFinder(cx, cy) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy))
        this.setFunction(cx + dx, cy + dy, dist !== 2 && dist !== 4)
      }
    }
  }

  drawAlignment(cx, cy) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
      }
    }
  }

  // Information de format : niveau L (01) + masque, protégée par BCH.
  drawFormat(mask) {
    const data = (1 << 3) | mask
    let rem = data
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const bits = ((data << 10) | rem) ^ 0x5412
    const bit = (i) => ((bits >>> i) & 1) === 1
    const s = this.size
    for (let i = 0; i <= 5; i++) this.setFunction(8, i, bit(i))
    this.setFunction(8, 7, bit(6))
    this.setFunction(8, 8, bit(7))
    this.setFunction(7, 8, bit(8))
    for (let i = 9; i < 15; i++) this.setFunction(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) this.setFunction(s - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) this.setFunction(8, s - 15 + i, bit(i))
    this.setFunction(8, s - 8, true)
  }

  // Information de version (à partir de la version 7), protégée par BCH.
  drawVersion(ver) {
    if (ver < 7) return
    let rem = ver
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
    const bits = (ver << 12) | rem
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) === 1
      const a = this.size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      this.setFunction(a, b, dark)
      this.setFunction(b, a, dark)
    }
  }

  drawFunctionPatterns(ver) {
    const s = this.size
    for (let i = 0; i < s; i++) {
      this.setFunction(6, i, i % 2 === 0)
      this.setFunction(i, 6, i % 2 === 0)
    }
    this.drawFinder(3, 3)
    this.drawFinder(s - 4, 3)
    this.drawFinder(3, s - 4)
    const pos = alignmentPositions(ver)
    const n = pos.length
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const corner =
          (i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)
        if (!corner) this.drawAlignment(pos[i], pos[j])
      }
    }
    this.drawFormat(0) // réservé ; réécrit avec le masque définitif
    this.drawVersion(ver)
  }

  // Place les codewords en zigzag, colonnes de deux, de droite à gauche.
  drawData(data) {
    const s = this.size
    let i = 0
    for (let right = s - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5
      for (let vert = 0; vert < s; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j
          const upward = ((right + 1) & 2) === 0
          const y = upward ? s - 1 - vert : vert
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) === 1
            i++
          }
        }
      }
    }
  }

  applyMask(mask) {
    const s = this.size
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        if (this.isFunction[y][x]) continue
        let invert
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break
          case 1: invert = y % 2 === 0; break
          case 2: invert = x % 3 === 0; break
          case 3: invert = (x + y) % 3 === 0; break
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break
          default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
        }
        if (invert) this.modules[y][x] = !this.modules[y][x]
      }
    }
  }

  // Pénalité simplifiée : suites de 5+ modules (règle 1), blocs 2×2 (règle 2),
  // proportion de modules sombres (règle 4).
  penalty() {
    const s = this.size
    const m = this.modules
    let score = 0
    let dark = 0
    for (let y = 0; y < s; y++) {
      let runX = 0
      let runY = 0
      for (let x = 0; x < s; x++) {
        if (m[y][x]) dark++
        runX = x > 0 && m[y][x] === m[y][x - 1] ? runX + 1 : 1
        if (runX === 5) score += 3
        else if (runX > 5) score += 1
        runY = x > 0 && m[x][y] === m[x - 1][y] ? runY + 1 : 1
        if (runY === 5) score += 3
        else if (runY > 5) score += 1
        if (y > 0 && x > 0) {
          const c = m[y][x]
          if (c === m[y][x - 1] && c === m[y - 1][x] && c === m[y - 1][x - 1]) score += 3
        }
      }
    }
    const total = s * s
    const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1
    return score + Math.max(0, k) * 10
  }
}

// Octets UTF-8 du texte.
function toBytes(text) {
  if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(text))
  return Array.from(unescape(encodeURIComponent(text)), (ch) => ch.charCodeAt(0))
}

// Matrice du QR code (mode octets, niveau L) : { size, modules } ou null si le
// texte dépasse la capacité (version 40, 2953 octets).
export function qrMatrix(text) {
  const bytes = toBytes(String(text))
  let ver = 0
  for (let v = 1; v <= 40; v++) {
    const countBits = v <= 9 ? 8 : 16
    if (4 + countBits + bytes.length * 8 <= dataCodewords(v) * 8) {
      ver = v
      break
    }
  }
  if (!ver) return null

  // Flux de bits : mode 0100, longueur, octets, terminateur, bourrage.
  const bits = []
  const push = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1)
  }
  push(4, 4)
  push(bytes.length, ver <= 9 ? 8 : 16)
  bytes.forEach((b) => push(b, 8))
  const capacity = dataCodewords(ver) * 8
  push(0, Math.min(4, capacity - bits.length))
  while (bits.length % 8 !== 0) bits.push(0)
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8)
  const data = []
  for (let i = 0; i < bits.length; i += 8) {
    data.push(parseInt(bits.slice(i, i + 8).join(''), 2))
  }

  const mx = new Matrix(ver * 4 + 17)
  mx.drawFunctionPatterns(ver)
  mx.drawData(addEcc(data, ver))

  let best = 0
  let bestScore = Infinity
  for (let mask = 0; mask < 8; mask++) {
    mx.applyMask(mask)
    mx.drawFormat(mask)
    const score = mx.penalty()
    if (score < bestScore) {
      bestScore = score
      best = mask
    }
    mx.applyMask(mask) // annule (XOR)
  }
  mx.applyMask(best)
  mx.drawFormat(best)
  return { size: mx.size, version: ver, mask: best, modules: mx.modules }
}

// Tracé SVG : { size, d } où `d` dessine un carré par module sombre, en
// unités de module (viewBox « 0 0 size size »). null si trop long.
export function qrSvgPath(text) {
  const qr = qrMatrix(text)
  if (!qr) return null
  const parts = []
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.modules[y][x]) parts.push(`M${x} ${y}h1v1h-1z`)
    }
  }
  return { size: qr.size, d: parts.join('') }
}
