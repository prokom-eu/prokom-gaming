import path from 'path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import optionsSeed from '../../seed/prokomgaming/options.json' with { type: 'json' }

import { caseBoxOf, casePhotoIssues, casePhotoOf, caseVars, drawnWidthOf } from './caseBox'
import { measureCaseBox } from './caseBoxMeasure'

/** A transparent canvas with an opaque rectangle at a known place. */
async function png(
  width: number,
  height: number,
  rect: { left: number; top: number; w: number; h: number },
) {
  const block = await sharp({
    create: {
      width: rect.w,
      height: rect.h,
      channels: 4,
      background: { r: 20, g: 20, b: 20, alpha: 1 },
    },
  })
    .png()
    .toBuffer()
  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: block, left: rect.left, top: rect.top }])
    .png()
    .toBuffer()
}

describe('measureCaseBox', () => {
  it('finds the opaque rectangle inside a transparent margin', async () => {
    const box = await measureCaseBox(await png(200, 100, { left: 20, top: 10, w: 150, h: 80 }))
    expect(box).toEqual({ x: 0.1, y: 0.1, w: 0.75, h: 0.8 })
  })

  it('returns the whole image when there is no margin', async () => {
    const box = await measureCaseBox(await png(50, 40, { left: 0, top: 0, w: 50, h: 40 }))
    expect(box).toEqual({ x: 0, y: 0, w: 1, h: 1 })
  })

  it('returns null for an image without alpha (nothing to trim)', async () => {
    const jpeg = await sharp({
      create: { width: 30, height: 30, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .jpeg()
      .toBuffer()
    expect(await measureCaseBox(jpeg)).toBeNull()
  })

  it('returns null for a fully transparent image', async () => {
    const empty = await sharp({
      create: { width: 30, height: 30, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer()
    expect(await measureCaseBox(empty)).toBeNull()
  })

  it('measures every case photo of the seed (the photos the site starts with)', async () => {
    const cases = optionsSeed.items.filter((o) => o.type === 'case' && o.image)
    expect(cases.length).toBeGreaterThan(0)
    for (const option of cases) {
      const box = await measureCaseBox(path.resolve('seed/prokomgaming/media', option.image!))
      // A photo without transparency would put the whole file on the stand (margin included).
      expect(box, option.code).not.toBeNull()
      expect(box!.w, option.code).toBeGreaterThan(0.5)
      expect(box!.h, option.code).toBeGreaterThan(0.5)
      expect(box!.x + box!.w, option.code).toBeLessThanOrEqual(1)
      expect(box!.y + box!.h, option.code).toBeLessThanOrEqual(1)
    }
  })

  it('finds the transparent margin of a typical photo', async () => {
    const box = await measureCaseBox(path.resolve('seed/prokomgaming/media/options/SIG3A.webp'))
    // ~33 px margin on a 787×900 file.
    expect(box!.x).toBeGreaterThan(0.03)
    expect(box!.x + box!.w).toBeLessThan(0.97)
    expect(box!.y + box!.h).toBeLessThan(0.97)
  })
})

describe('caseBoxOf / casePhotoOf / caseVars', () => {
  it('accepts only a complete box with a positive size', () => {
    expect(caseBoxOf({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })).toEqual({
      x: 0.1,
      y: 0.1,
      w: 0.8,
      h: 0.8,
    })
    expect(caseBoxOf({ x: 0.1, y: null, w: 0.8, h: 0.8 })).toBeNull()
    expect(caseBoxOf({ x: 0, y: 0, w: 0, h: 1 })).toBeNull()
    expect(caseBoxOf(null)).toBeNull()
  })

  it('needs the URL and the pixel size of the file', () => {
    expect(casePhotoOf({ url: '/a.webp', alt: 'A', width: 400, height: 500 })).toEqual({
      src: '/a.webp',
      alt: 'A',
      width: 400,
      height: 500,
      box: null,
    })
    expect(casePhotoOf({ url: '/a.webp', alt: 'A' })).toBeNull()
    expect(casePhotoOf(null)).toBeNull()
  })

  it('gives the case its own aspect, not the file’s', () => {
    // File 800×1000 (0.8); the case fills half the width and 80% of the height → 0.5.
    const vars = caseVars({ width: 800, height: 1000, box: { x: 0.25, y: 0.1, w: 0.5, h: 0.8 } })
    expect(vars).toMatchObject({
      '--bx': 0.25,
      '--by': 0.1,
      '--bw': 0.5,
      '--bh': 0.8,
      '--case-ar': 0.5,
    })
  })

  it('treats a photo without a box as all case', () => {
    expect(caseVars({ width: 400, height: 500, box: null })).toMatchObject({
      '--bx': 0,
      '--bh': 1,
      '--case-ar': 0.8,
    })
  })
})

describe('drawnWidthOf', () => {
  it('is the width of the whole file when the case itself is that tall', () => {
    // Case 90% of a 800×1000 file: 180 px case → file 200 px tall → 160 px wide.
    expect(
      drawnWidthOf({ width: 800, height: 1000, box: { x: 0, y: 0.05, w: 1, h: 0.9 } }, 180),
    ).toBe(160)
    expect(drawnWidthOf({ width: 800, height: 1000, box: null }, 180)).toBe(144)
  })

  it('rounds up, so a 2x file is never narrower than twice the drawn width', () => {
    expect(drawnWidthOf({ width: 837, height: 873, box: null }, 180)).toBe(173)
  })
})

describe('casePhotoIssues (runda v3 §1.2)', () => {
  it('passes a tall case with a transparent margin', () => {
    expect(
      casePhotoIssues({ width: 1200, height: 1400, box: { x: 0.05, y: 0.03, w: 0.9, h: 0.93 } }),
    ).toEqual([])
  })

  it('flags a case touching the edge of its file (cut at the source)', () => {
    expect(
      casePhotoIssues({ width: 1200, height: 1400, box: { x: 0, y: 0.03, w: 0.9, h: 0.93 } }),
    ).toEqual(['edge'])
    // `media.box` is rounded to 4 decimals: 0.9999 still touches.
    expect(
      casePhotoIssues({ width: 1200, height: 1400, box: { x: 0.05, y: 0.03, w: 0.9, h: 0.9699 } }),
    ).toEqual(['edge'])
  })

  it('flags a case under 900 px tall', () => {
    expect(
      casePhotoIssues({ width: 800, height: 950, box: { x: 0.05, y: 0.03, w: 0.9, h: 0.93 } }),
    ).toEqual(['small'])
  })

  it('treats a photo without a box (no transparency) as touching every edge', () => {
    expect(casePhotoIssues({ width: 1200, height: 1400, box: null })).toEqual(['edge'])
    expect(casePhotoIssues({ width: null, height: null, box: null })).toEqual(['edge', 'small'])
  })

  it('flags the seed photos the review found (EXO, LB500 cut; PANO130, PANO100 small)', async () => {
    const issuesOf = async (code: string) => {
      const file = path.resolve('seed/prokomgaming/media/options', `${code}.webp`)
      const meta = await sharp(file).metadata()
      return casePhotoIssues({
        width: meta.width,
        height: meta.height,
        box: await measureCaseBox(file),
      })
    }
    expect(await issuesOf('EXO')).toEqual(['edge', 'small'])
    expect(await issuesOf('LB500')).toEqual(['edge', 'small'])
    expect(await issuesOf('PANO130')).toEqual(['small'])
    expect(await issuesOf('PANO100')).toEqual(['small'])
  })
})
