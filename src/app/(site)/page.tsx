import { connection } from 'next/server'

import { Hero } from '@/components/home/Hero'
import { WorkshopStrip } from '@/components/home/WorkshopStrip'
import { EMPTY_HERO, type HeroData } from '@/lib/home'
import { loadHero } from '@/lib/home.server'
import { errorFields, log } from '@/lib/logger'

import '@/components/home/home.css'

// Sections 3–13 of the home page come in G8 (spec. §4).
export default async function HomePage() {
  // Rendered per request: the hero reads builds, prices and FPS from the database, and the image
  // build (`docker build`) has none. A few Local API queries cost milliseconds.
  await connection()
  let hero: HeroData
  try {
    hero = await loadHero()
  } catch (error) {
    // A database hiccup must not take the home page down: the hero keeps its text and buttons.
    log.error({ ...errorFields(error) }, 'home hero data failed')
    hero = EMPTY_HERO
  }
  return (
    <>
      <Hero data={hero} />
      <WorkshopStrip />
    </>
  )
}
