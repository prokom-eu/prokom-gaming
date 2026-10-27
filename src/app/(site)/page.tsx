import { connection } from 'next/server'

import { BeforeShipping } from '@/components/home/BeforeShipping'
import { Bestiary } from '@/components/home/Bestiary'
import { Games } from '@/components/home/Games'
import { Hero } from '@/components/home/Hero'
import { HowToBuy } from '@/components/home/HowToBuy'
import { StartPaths } from '@/components/home/StartPaths'
import { WorkshopStrip } from '@/components/home/WorkshopStrip'
import { EMPTY_HOME, type HomeData } from '@/lib/home'
import { loadHome } from '@/lib/home.server'
import { errorFields, log } from '@/lib/logger'

import '@/components/home/home.css'
import '@/components/home/sections.css'

// Sections 8–13 come in the second G8 PR (spec. §4).
export default async function HomePage() {
  // Rendered per request: the page reads builds, prices and FPS from the database, and the image
  // build (`docker build`) has none. A few Local API queries cost milliseconds.
  await connection()
  let home: HomeData
  try {
    home = await loadHome()
  } catch (error) {
    // A database hiccup must not take the home page down: text and buttons stay.
    log.error({ ...errorFields(error) }, 'home data failed')
    home = EMPTY_HOME
  }
  return (
    <>
      <Hero data={home.hero} />
      <WorkshopStrip />
      <StartPaths />
      <Bestiary hero={home.hero} games={home.panel?.games ?? []} />
      <HowToBuy />
      <Games panel={home.panel} />
      <BeforeShipping metric={home.metric} />
    </>
  )
}
