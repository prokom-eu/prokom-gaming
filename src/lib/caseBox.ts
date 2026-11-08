import type { CSSProperties } from 'react'

/**
 * Where the case really is in its photo: the box of the non-transparent pixels, as fractions
 * (0–1) of the file's width and height (runda v2 §3.1, §3.3). Measured once, when the photo is
 * uploaded (`media.box`), so the page places the case itself and not the file with its margins.
 */
export type CaseBox = { x: number; y: number; w: number; h: number }

/** A case photo as the hero and the cards draw it (public fields only). */
export type CasePhoto = {
  src: string
  alt: string
  /** Pixel size of the file, for the aspect ratio. */
  width: number
  height: number
  /** `null`: not measured (no alpha channel, or an old file) — the whole file counts as the case. */
  box: CaseBox | null
}

const WHOLE: CaseBox = { x: 0, y: 0, w: 1, h: 1 }

/** `media.box` as stored (nullable numbers from Payload) → a box, or `null` if incomplete. */
export function caseBoxOf(
  box:
    | { x?: number | null; y?: number | null; w?: number | null; h?: number | null }
    | null
    | undefined,
): CaseBox | null {
  if (!box) return null
  const { x, y, w, h } = box
  if (x == null || y == null || w == null || h == null || w <= 0 || h <= 0) return null
  return { x, y, w, h }
}

/** A populated `media` document → the photo, or `null` without a file URL or size. */
export function casePhotoOf(
  image:
    | {
        url?: string | null
        alt?: string | null
        width?: number | null
        height?: number | null
        box?: Parameters<typeof caseBoxOf>[0]
      }
    | null
    | undefined,
): CasePhoto | null {
  if (!image?.url || !image.width || !image.height) return null
  return {
    src: image.url,
    alt: image.alt ?? '',
    width: image.width,
    height: image.height,
    box: caseBoxOf(image.box),
  }
}

/**
 * CSS variables for `CasePhoto` (component): the box and the case's own aspect (width / height of
 * the case, not of the file), which lets the parent cap the case by width as well as by height.
 */
export function caseVars(photo: Pick<CasePhoto, 'width' | 'height' | 'box'>): CSSProperties {
  const b = photo.box ?? WHOLE
  const fileAspect = photo.width / photo.height
  return {
    '--bx': b.x,
    '--by': b.y,
    '--bw': b.w,
    '--bh': b.h,
    '--case-ar': round((b.w * fileAspect) / b.h),
  } as CSSProperties
}

/**
 * How wide the whole file is drawn (CSS px) when the case itself is `caseHeight` tall. Rounded up,
 * so the 2x file of a 1x/2x srcset is at least twice as wide as drawn (runda v3 §1.1).
 */
export function drawnWidthOf(
  photo: Pick<CasePhoto, 'width' | 'height' | 'box'>,
  caseHeight: number,
): number {
  const b = photo.box ?? WHOLE
  return Math.ceil(((caseHeight / b.h) * photo.width) / photo.height)
}

/** Shortest case photo file (px) that stays sharp in the hero (runda v3 §1.2). */
export const CASE_MIN_HEIGHT = 900
/** `media.box` is rounded to 4 decimals: closer than this to a side counts as touching it. */
const EDGE = 0.002

export type CasePhotoIssue = 'edge' | 'small'

/** What the panel says about such a photo (runda v3 §1.2). */
export const CASE_PHOTO_WARNING = 'Zdjęcie ucięte lub za małe'
export const CASE_PHOTO_HINT =
  'Całe zdjęcie obudowy z przezroczystym tłem, bez napisów, najlepiej 1200 px wysokości (min. 900 px).'

/**
 * Why a case photo should be replaced (runda v3 §1.2): `edge` — the case touches the file's edge
 * (cut at the source; no box means no transparency, so the whole file is the case), `small` —
 * the file is under `CASE_MIN_HEIGHT` px tall. Empty when the photo is fine.
 */
export function casePhotoIssues(photo: {
  width?: number | null
  height?: number | null
  box: CaseBox | null
}): CasePhotoIssue[] {
  const b = photo.box ?? WHOLE
  const issues: CasePhotoIssue[] = []
  if (b.x < EDGE || b.y < EDGE || b.x + b.w > 1 - EDGE || b.y + b.h > 1 - EDGE) issues.push('edge')
  if (!photo.height || photo.height < CASE_MIN_HEIGHT) issues.push('small')
  return issues
}

const round = (n: number) => Math.round(n * 10000) / 10000
