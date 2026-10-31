// Panel icons for the phone home screen (ADR-G010 §2): monogram "PK" in gold on the panel
// background (decision of Krystian, P1 31.10.2026). Letters drawn as strokes, so no font is
// needed to render them. Run once after a change: `node scripts/admin-icons.mjs`; the PNGs
// are committed in public/admin-assets.
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const BG = '#080c0b' // --p-bg
const GOLD = '#f2c230' // --p-gold
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/admin-assets')

// "PK" in a 417 × 296 box (stroke 64).
const LETTERS = `
  <g fill="none" stroke="${GOLD}" stroke-width="64" stroke-linejoin="miter" stroke-miterlimit="2">
    <path d="M32 296 V32 H110 a66 66 0 0 1 0 132 H32" />
    <path d="M268 32 V296" />
    <path d="M392 32 L280 160 L398 296" />
  </g>`

/** `scale` < 1 keeps the letters in the safe zone of a maskable icon (inner 80% circle). */
function svg(size, scale) {
  const w = 430 * scale
  const h = 296 * scale
  const x = (512 - w) / 2
  const y = (512 - h) / 2
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}" />
  <g transform="translate(${x} ${y}) scale(${scale})">${LETTERS}</g>
</svg>`)
}

const ICONS = [
  { file: 'icon-192.png', size: 192, scale: 0.86 },
  { file: 'icon-512.png', size: 512, scale: 0.86 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.62 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.78 },
]

await mkdir(out, { recursive: true })
for (const { file, size, scale } of ICONS) {
  await sharp(svg(size, scale)).png({ compressionLevel: 9 }).toFile(path.join(out, file))
  console.log(`${file} ${size}×${size}`)
}
