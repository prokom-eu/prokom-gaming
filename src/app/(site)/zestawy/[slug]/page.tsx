import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { cache, type CSSProperties } from 'react'

import { BuildHero } from '@/components/build/BuildHero'
import { BuyBlock } from '@/components/build/BuyBlock'
import { Care, InTheBox } from '@/components/build/Aftercare'
import { Interior } from '@/components/build/Interior'
import { Journey } from '@/components/build/Journey'
import { BuildFaq, Neighbours } from '@/components/build/Neighbours'
import { StickyBar } from '@/components/build/StickyBar'
import { TuneBuild } from '@/components/build/TuneBuild'
import { buildJsonLd, ownLight } from '@/lib/buildPage'
import { loadBuildPage } from '@/lib/buildPage.server'
import { getEnv } from '@/lib/env'

import '@/components/build/build.css'

type Props = { params: Promise<{ slug: string }> }

// One read per request for both the metadata and the page.
const load = cache(loadBuildPage)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const data = await load((await params).slug)
  if (!data) return {}
  return { title: `${data.build.name} — komputer do gier`, description: data.build.why }
}

/**
 * Build page (spec. §6, boards Zestaw / Zestaw-telefon): sections 1–14 in spec order; reviews
 * (pt 11) are not rendered until real ones exist — TODO(krystian), like the home page.
 */
export default async function BuildPage({ params }: Props) {
  // Rendered per request like the list: builds, prices and FPS come from the database, and the
  // image build (`docker build`) has none.
  await connection()
  const { slug } = await params
  const data = await load(slug)
  if (!data) notFound()
  const { build } = data
  const pageUrl = new URL(`/zestawy/${build.slug}`, getEnv().SITE_URL).toString()
  const jsonLd = buildJsonLd({
    siteUrl: getEnv().SITE_URL,
    slug: build.slug,
    name: build.name,
    description: build.why,
    image: build.photo?.src ?? null,
    price: build.price,
    pricedAt: data.pricedAt,
    faq: data.faq,
  })

  return (
    <div className="bp" style={{ '--c': `var(--c-${build.slug})` } as CSSProperties}>
      <script
        type="application/ld+json"
        // JSON-LD as Next recommends: `<` escaped, so no text can close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <BuildHero data={data} />
      <StickyBar data={data} />
      <BuyBlock data={data} pageUrl={pageUrl} />
      <Interior data={data} />
      {build.price !== null && build.cpu && build.gpu && (
        <TuneBuild
          slug={build.slug}
          name={build.name}
          accusative={build.accusative}
          cpu={build.cpu}
          gpu={build.gpu}
          ramType={data.ramType}
          ownLight={ownLight(build.look)}
          config={data.config}
          price={build.price}
          ram={data.tune.ram}
          ssd={data.tune.ssd}
        />
      )}
      <Journey />
      <InTheBox />
      <Care />
      {/* TODO(krystian): „Opinie o {istocie}” (spec. §6 pt 11) — only real reviews, 1:1 with a
          date; hidden until they exist (no model for them yet, like the home page). */}
      <Neighbours data={data} />
      <BuildFaq data={data} />
    </div>
  )
}
