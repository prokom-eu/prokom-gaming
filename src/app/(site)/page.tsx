import type { Metadata } from 'next'
import { connection } from 'next/server'

import { BeforeShipping } from '@/components/home/BeforeShipping'
import { Bestiary } from '@/components/home/Bestiary'
import { CompareTeaser } from '@/components/home/CompareTeaser'
import { FinalCta } from '@/components/home/FinalCta'
import { ForParents } from '@/components/home/ForParents'
import { Games } from '@/components/home/Games'
import { Hero } from '@/components/home/Hero'
import { HomeFaq } from '@/components/home/HomeFaq'
import { HowToBuy } from '@/components/home/HowToBuy'
import { Included } from '@/components/home/Included'
import { StartPaths } from '@/components/home/StartPaths'
import { WorkshopStrip } from '@/components/home/WorkshopStrip'
import { JsonLd } from '@/components/JsonLd'
import { getEnv } from '@/lib/env'
import { EMPTY_HOME, type HomeData } from '@/lib/home'
import { loadHome } from '@/lib/home.server'
import { errorFields, log } from '@/lib/logger'
import { DESCRIPTIONS, HOME_TITLE, organizationJsonLd } from '@/lib/seo'
import { EMPTY_WORKSHOP, loadWorkshop, type Workshop } from '@/lib/workshop.server'

import '@/components/home/home.css'
import '@/components/home/sections.css'
import '@/components/paper.css'

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: DESCRIPTIONS.home,
  alternates: { canonical: '/' },
}

// Home page, sections in the order of spec. §4.
export default async function HomePage() {
  // Rendered per request: the page reads builds, prices and FPS from the database, and the image
  // build (`docker build`) has none. A few Local API queries cost milliseconds.
  await connection()
  // Both reads at once; each falls back on its own, so one failing never takes the page down.
  const [home, workshop] = await Promise.all([
    loadHome().catch((error: unknown): HomeData => {
      // A database hiccup must not take the home page down: text and buttons stay.
      log.error({ ...errorFields(error) }, 'home data failed')
      return EMPTY_HOME
    }),
    loadWorkshop().catch((error: unknown): Workshop => {
      // Without orders the strip shows the fixed process — as before G14.
      log.error({ ...errorFields(error) }, 'workshop strip failed')
      return EMPTY_WORKSHOP
    }),
  ])
  return (
    <>
      {/* The brand and the shop (spec. §23): Organization + LocalBusiness. */}
      <JsonLd data={organizationJsonLd(getEnv().SITE_URL)} />
      <Hero data={home.hero} />
      <WorkshopStrip items={workshop.items} />
      <StartPaths />
      <Bestiary hero={home.hero} games={home.panel?.games ?? []} />
      <HowToBuy />
      <Games panel={home.panel} />
      <BeforeShipping metric={home.metric} inWorkshop={workshop.inWorkshop} />
      {/* §4 pt 8 "Co mówią o nas klienci" stays hidden until real Google reviews exist (only
          genuine ones, 1:1, dated). TODO(krystian): rating and reviews in `site-settings`. */}
      <ForParents />
      <CompareTeaser data={home.compare} />
      <Included />
      <HomeFaq questions={home.faq} />
      <FinalCta />
    </>
  )
}
