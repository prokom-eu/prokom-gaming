import { connection } from 'next/server'

import { Hero } from '@/components/home/Hero'
import { WorkshopStrip } from '@/components/home/WorkshopStrip'
import { loadHero } from '@/lib/home.server'

import '@/components/home/home.css'

// Sections 3–13 of the home page come in G8 (spec. §4).
export default async function HomePage() {
  // Rendered per request: the hero reads builds, prices and FPS from the database, and the image
  // build (`docker build`) has none. A few Local API queries cost milliseconds.
  await connection()
  const hero = await loadHero()
  return (
    <>
      <Hero data={hero} />
      <WorkshopStrip />
    </>
  )
}
