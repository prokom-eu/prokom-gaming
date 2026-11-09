import Image from 'next/image'

import { FadeImage } from '@/components/motion/FadeImage'
import { caseVars, drawnWidthOf, type CasePhoto as CasePhotoData } from '@/lib/caseBox'

import './case-photo.css'

type Props = {
  photo: CasePhotoData
  /** `next/image` sizes of the whole file (it is drawn a bit larger than the case)… */
  sizes?: string
  /**
   * …or, for small pictures, about how wide the whole file is drawn (CSS px): a short 1x/2x
   * srcset instead of every device width, which keeps 16 cards from bloating the page HTML.
   */
  drawnWidth?: number
  /**
   * …or the largest height of the case itself (CSS px). The file's drawn width follows from the
   * case's box, so a case with a wide transparent margin still gets a sharp 2x file.
   */
  caseHeight?: number
  /** Empty when the picture is decorative (the cards); the hero passes the photo's own text. */
  alt?: string
  eager?: boolean
  /** The LCP element (hero photo on a phone). */
  priority?: boolean
}

/**
 * A case standing on its stand (runda v2 §3.1, §3.3). The case itself — not the file with its
 * transparent margin — gets the height `--case-h-max` (capped by `--case-w-max` for wide cases),
 * its centre on `--case-cx` and its feet on `--case-base`. The parent sets those three in its own
 * CSS and must be `position: relative` (or absolute).
 */
export function CasePhoto({
  photo,
  sizes,
  drawnWidth,
  caseHeight,
  alt = '',
  eager = false,
  priority = false,
}: Props) {
  // With a drawn size the width/height props only carry the aspect (and the 1x/2x srcset); CSS
  // sets the real size.
  const drawn = drawnWidth ?? (caseHeight ? drawnWidthOf(photo, caseHeight) : undefined)
  const width = drawn ?? photo.width
  const height = drawn ? Math.round((drawn * photo.height) / photo.width) : photo.height
  // A lazy photo emerges once loaded (runda v3 PREMIUM §2.3); an eager one may be the LCP.
  const Img = eager || priority ? Image : FadeImage
  return (
    <span className="case" style={caseVars(photo)}>
      <Img
        className="case__img"
        src={photo.src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        loading={eager || priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
      />
    </span>
  )
}
