// Renders the site icon (src/app/(site)/icon.svg, the „P–K” mark on night) to the files Google and
// browsers read without our SVG (runda v2 §1.1, Google: square, multiple of 48 px, stable address):
// - src/app/favicon.ico — 16, 32 and 48 px in one file (Next serves it at /favicon.ico; only the
//   top-level app/ may hold it);
// - src/app/(site)/icon1.png (192 px) and icon2.png (512 px) — numbered `icon` files, linked by
//   Next next to icon.svg.
// Run after a change of the mark: node scripts/site-icons.mjs
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const svg = await readFile('src/app/(site)/icon.svg')

/** The mark as a PNG of `size` px (density high enough for 512 px from a 64-unit viewBox). */
const png = (size) =>
  sharp(svg, { density: Math.max(72, (size / 64) * 72 * 2) })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer()

/**
 * An ICO container with PNG images inside (supported by every browser since Windows Vista):
 * 6-byte header, one 16-byte directory entry per image, then the PNG files one after another.
 */
function ico(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1) // height
    entry.writeUInt8(0, 2) // no palette
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // colour planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += data.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)])
}

const icoSizes = [16, 32, 48]
const favicon = ico(
  await Promise.all(icoSizes.map(async (size) => ({ size, data: await png(size) }))),
)
await writeFile('src/app/favicon.ico', favicon)
await writeFile('src/app/(site)/icon1.png', await png(192))
await writeFile('src/app/(site)/icon2.png', await png(512))
console.log(
  `favicon.ico ${icoSizes.join('/')} px, ${favicon.length} bytes; icon1.png 192; icon2.png 512`,
)
