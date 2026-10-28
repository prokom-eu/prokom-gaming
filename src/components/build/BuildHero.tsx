import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'

import { IconArrow } from '@/components/icons'
import { Scene } from '@/components/Scene'
import { Sigil } from '@/components/Sigil'
import type { BuildPageData } from '@/lib/buildPage.server'
import { buildHref, routes } from '@/lib/nav'

/**
 * Build page hero (spec. §6 pt 1, board Zestaw `.zh5`): the creature's scene, crumbs, tier, epithet
 * and the giant name in its material, the case on the stage, „Z podań” with its source on the
 * left, „W grach” and the previous / next creature on the right.
 */
export function BuildHero({ data }: { data: BuildPageData }) {
  const { build, switcher } = data
  return (
    <section
      className="bp-hero"
      data-scene-top
      data-material={build.material}
      style={{ '--fs': build.nameSize } as CSSProperties}
      aria-labelledby="bp-name"
    >
      <Scene id={build.key} eager />
      <div className="bp-hero__fade" aria-hidden="true" />

      <nav className="bp-crumbs" aria-label="Okruszki">
        <Link href={routes.home}>Strona główna</Link>
        <span aria-hidden="true">/</span>
        <Link href={routes.builds}>Zestawy</Link>
        <span aria-hidden="true">/</span>
        <span>Moc {build.tierRoman}</span>
        <span aria-hidden="true">/</span>
        <b aria-current="page">{build.name}</b>
      </nav>

      <div className="bp-title">
        <span className="bp-title__kick">
          Moc {build.tierRoman}, {build.tierLabel}
        </span>
        <span className="bp-title__epithet lore">
          <i aria-hidden="true" />
          {build.epithet}
          <i aria-hidden="true" />
        </span>
        <h1 id="bp-name" className="bp-title__name nm">
          {build.name}
        </h1>
      </div>

      <div className="bp-stage" aria-hidden="true">
        <span className="bp-stage__halo" />
        {build.photo && (
          <Image
            className="bp-stage__photo"
            src={build.photo.src}
            alt=""
            width={444}
            height={505}
            sizes="(max-width: 1000px) 320px, 430px"
            loading="eager"
            fetchPriority="high"
          />
        )}
      </div>

      <div className="bp-myth">
        <span className="bp-myth__sigil" aria-hidden="true">
          <Sigil id={build.key} size={44} />
        </span>
        <div>
          <span className="bp-k">Z podań</span>
          <p className="lore">{build.legend}</p>
          <a className="bp-src" href={build.legendSource.url} rel="noopener" target="_blank">
            Źródło: {build.legendSource.title}
            <span className="sr-only"> (otwiera się w nowej karcie)</span>
          </a>
        </div>
      </div>

      <div className="bp-gift">
        <span className="bp-k">W grach</span>
        <b className="h">{build.heroTitle}</b>
        <p>{build.heroText}</p>
        {switcher && (
          <div className="bp-switch">
            <Link
              className="bp-switch__btn"
              href={buildHref(switcher.prev.slug)}
              aria-label={`Poprzednia istota: ${switcher.prev.name}`}
            >
              <IconArrow size={18} style={{ transform: 'scaleX(-1)' }} />
            </Link>
            <span>
              <b>{switcher.position}</b> z {switcher.total} istot
            </span>
            <Link
              className="bp-switch__btn"
              href={buildHref(switcher.next.slug)}
              aria-label={`Następna istota: ${switcher.next.name}`}
            >
              <IconArrow size={18} />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
