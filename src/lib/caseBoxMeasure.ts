// No `server-only` marker: the Payload CLI runs this in a migration (backfill of `media.box`),
// where the marker cannot load. sharp is native, so it can never end up in a browser bundle anyway.

import sharp from 'sharp'

import type { CaseBox } from './caseBox'

/** Alpha above this counts as the case (drops faint antialiasing and stray specks). */
const ALPHA_MIN = 8

/**
 * Box of the non-transparent pixels of an image, as fractions of its size. `null` when the image
 * has no alpha channel (a JPEG: there is no margin to find) or is fully transparent.
 */
export async function measureCaseBox(input: Buffer | string): Promise<CaseBox | null> {
  const image = sharp(input)
  const meta = await image.metadata()
  if (!meta.hasAlpha) return null
  const { data, info } = await image
    .extractChannel('alpha')
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height } = info
  let top = height
  let bottom = -1
  let left = width
  let right = -1
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      if (data[row + x] <= ALPHA_MIN) continue
      if (y < top) top = y
      if (y > bottom) bottom = y
      if (x < left) left = x
      if (x > right) right = x
    }
  }
  if (bottom < 0) return null
  return {
    x: round(left / width),
    y: round(top / height),
    w: round((right - left + 1) / width),
    h: round((bottom - top + 1) / height),
  }
}

const round = (n: number) => Math.round(n * 10000) / 10000
