import { getImageProps } from 'next/image'

import { DESKTOP } from '@/lib/motion'

type Props = {
  /** Creature key of the files in /public/scenes (e.g. `licho`, `baba`). */
  id: string
  /** `sizes` of the panorama in its parent (the same for every plane). */
  sizes: string
  /** Above the fold: the picture loads at once with high priority (ADR-G003 §6). */
  eager?: boolean
  /**
   * The files as they are on disk, past the image optimiser. For the home hero: it draws the
   * panorama 3–4.5 screens wide, so every width wants the whole 2880 px file anyway, and the
   * optimiser only re-encoded it — 1–1.7 s per cold file on the server, several at once per visit.
   */
  original?: boolean
}

/**
 * A creature's hero panorama as parallax planes (runda v3 PREMIUM §2.4). On a desktop width the
 * back plane (`-back`, opaque: sky, far hills, ground) and the near plane (`-near`, transparent:
 * mist, near silhouettes) move apart with the mouse; on a phone one flat picture (`-hero`), as
 * ADR-G003 §5 asks — the `<picture>` source picks the file, so a phone never downloads the planes.
 * Both fill the parent, which must be `position: relative`. Decorative (empty `alt`).
 */
export function SceneLayers({ id, sizes, eager = false, original = false }: Props) {
  const common = { alt: '', fill: true, sizes, unoptimized: original }
  const { props: backProps } = getImageProps({ ...common, src: `/scenes/${id}-back.webp` })
  // Unoptimised (`next dev`, `original`) there is no srcSet: the plain file then.
  const back = backProps.srcSet ?? backProps.src
  const { props: flat } = getImageProps({
    ...common,
    src: `/scenes/${id}-hero.webp`,
    loading: eager ? 'eager' : 'lazy',
    fetchPriority: eager ? 'high' : undefined,
  })
  // Lazy and hidden below the desktop width (CSS): a hidden lazy image is never fetched.
  const { props: near } = getImageProps({
    ...common,
    src: `/scenes/${id}-near.webp`,
    loading: 'lazy',
  })
  return (
    <>
      <picture className="scene-plane scene-plane--back">
        <source media={DESKTOP} srcSet={back} sizes={backProps.srcSet ? sizes : undefined} />
        {/* next/image's own props through getImageProps (Next docs: art direction). */}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img {...flat} />
      </picture>
      <span className="scene-plane scene-plane--near">
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img {...near} />
      </span>
    </>
  )
}
