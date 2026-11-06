import Image from 'next/image'

import { caseVars, type CasePhoto as CasePhotoData } from '@/lib/caseBox'

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
  alt = '',
  eager = false,
  priority = false,
}: Props) {
  // With `drawnWidth` the width/height props only carry the aspect; CSS sets the real size.
  const width = drawnWidth ?? photo.width
  const height = drawnWidth ? Math.round((drawnWidth * photo.height) / photo.width) : photo.height
  return (
    <span className="case" style={caseVars(photo)}>
      <Image
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
