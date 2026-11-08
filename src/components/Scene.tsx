import Image from 'next/image'

type Props = {
  /** Creature key of the files in /public/scenes (e.g. `licho`, `baba`). */
  id: string
  /** Above the fold (hero, page header): load at once with high priority (ADR-G003 §6). */
  eager?: boolean
  /**
   * Foreground layer with transparency, on every width (ADR-G003 §5: the phone gets background
   * + foreground, only without parallax). Always lazy: it is never the LCP element.
   */
  foreground?: boolean
  /**
   * `hero`: background `cover` (ADR-G003 §3). `wide`: page headers and 404 — the boards draw
   * the panorama at max(300%, 4320px) wide, anchored bottom-centre, so only its middle shows.
   */
  fit?: 'hero' | 'wide'
}

/**
 * Creature scene as image layers, not SVG filters (ADR-G003 §3): background 2880×1067 and an
 * optional foreground 2880×2000, both `cover` anchored bottom-centre in the parent, which must
 * be `position: relative`. Decorative (empty `alt`): the page text says what the scene shows.
 */
export function Scene({ id, eager = false, foreground = false, fit = 'hero' }: Props) {
  const loading = eager ? 'eager' : 'lazy'
  const fetchPriority = eager ? 'high' : undefined
  const src = `/scenes/${id}-hero.webp`
  return (
    <div className={fit === 'wide' ? 'scene scene--wide' : 'scene'} aria-hidden="true">
      {fit === 'wide' ? (
        <Image
          src={src}
          alt=""
          width={2880}
          height={1067}
          sizes="max(300vw, 4320px)"
          loading={loading}
          fetchPriority={fetchPriority}
        />
      ) : (
        <Image
          src={src}
          alt=""
          fill
          sizes="100vw"
          loading={loading}
          fetchPriority={fetchPriority}
        />
      )}
      {foreground && (
        <div className="scene__fg">
          <Image src={`/scenes/${id}-fg.webp`} alt="" fill sizes="100vw" loading="lazy" />
        </div>
      )}
    </div>
  )
}
