/**
 * Generates the PWA PNG icons with zero dependencies: the pixels are computed
 * directly (gradient rounded square + code-lines-and-play-head glyph) and
 * encoded as PNG via zlib. Run with `npm run icons`.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const lerp = (a, b, t) => a + (b - a) * t
const mix = (c1, c2, t) => c1.map((v, i) => lerp(v, c2[i], t))

const VIOLET = [139, 92, 246]
const FUCHSIA = [217, 70, 239]
const CYAN = [34, 211, 238]

/** Signed distance to a rounded rectangle centred at (cx, cy). */
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r
  const qy = Math.abs(py - cy) - hh + r
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

function render(size, { maskable }) {
  const px = Buffer.alloc(size * size * 4)
  const S = 4 // supersampling for anti-aliasing
  // Maskable icons need their content inside the central 80% safe zone.
  const inset = maskable ? 0 : 0.06
  const glyphScale = maskable ? 0.72 : 0.86

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const u = (x + (sx + 0.5) / S) / size
          const v = (y + (sy + 0.5) / S) / size

          // Background tile.
          const bgHalf = 0.5 - inset
          const inTile = maskable || sdRoundRect(u, v, 0.5, 0.5, bgHalf, bgHalf, 0.22) <= 0
          if (!inTile) continue

          const t = (u + v) / 2
          let col = t < 0.55 ? mix(VIOLET, FUCHSIA, t / 0.55) : mix(FUCHSIA, CYAN, (t - 0.55) / 0.45)
          // Soft highlight in the top-left.
          const glow = Math.max(0, 1 - Math.hypot(u - 0.25, v - 0.2) / 0.55) * 0.25
          col = mix(col, [255, 255, 255], glow)

          // Glyph in a normalized 40×40 box (matches the in-app Logo SVG).
          const gx = ((u - 0.5) / glyphScale) * 40 + 20
          const gy = ((v - 0.5) / glyphScale) * 40 + 20
          let white = 0
          const bars = [
            [8, 10, 17, 0.95],
            [12, 18.4, 13, 0.72],
            [8, 26.8, 10, 0.52],
          ]
          for (const [bx, by, bw, op] of bars) {
            if (sdRoundRect(gx, gy, bx + bw / 2, by + 1.6, bw / 2, 1.6, 1.6) <= 0) white = Math.max(white, op)
          }
          // Play triangle: (28,14.5) (34,20) (28,25.5)
          if (gx >= 28 && gx <= 34 && Math.abs(gy - 20) <= ((34 - gx) / 6) * 5.5) white = 1

          col = mix(col, [255, 255, 255], white)
          r += col[0]
          g += col[1]
          b += col[2]
          a += 255
        }
      }
      const n = S * S
      const i = (y * size + x) * 4
      const cover = a / n
      px[i] = cover ? Math.round((r / n) * (255 / cover)) : 0
      px[i + 1] = cover ? Math.round((g / n) * (255 / cover)) : 0
      px[i + 2] = cover ? Math.round((b / n) * (255 / cover)) : 0
      px[i + 3] = Math.round(cover)
    }
  }
  return encodePng(size, px)
}

const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['maskable-192.png', 192, true],
  ['maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
]

for (const [name, size, maskable] of targets) {
  writeFileSync(join(OUT, name), render(size, { maskable }))
  console.log(`  wrote public/icons/${name}`)
}
