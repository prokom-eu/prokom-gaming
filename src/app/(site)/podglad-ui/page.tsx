import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { FpsList } from '@/components/FpsList'
import { Container } from '@/components/ui/Container'
import { loadFpsTable } from '@/lib/fps.server'

import { UiPreview } from './UiPreview'

// Development-only preview of base components not yet used on any page (Chip, Segmented,
// BottomSheet, cookie banner, FPS list) — for axe and keyboard checks. 404 in production builds.
export const metadata: Metadata = {
  title: 'Podgląd komponentów',
  robots: { index: false, follow: false },
}

// The 12 games of board Zestaw („Ile klatek w Twojej grze”); the build page (G9) picks its own.
const BOARD_GAMES = [
  'Counter-Strike 2',
  'Fortnite',
  'Valorant',
  'League of Legends',
  'Minecraft',
  'EA Sports FC 27',
  'GTA V',
  'Cyberpunk 2077',
  'Wiedźmin 3',
  'Red Dead Redemption 2',
  'The Blood of Dawnwalker',
  'Black Myth: Wukong',
]

export default async function UiPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  // Real data from the database (`pnpm seed`), read the way the build page will.
  const { table, games } = await loadFpsTable({ builds: ['wampir'] })
  const listed = BOARD_GAMES.flatMap((name) => games.filter((g) => g.name === name))
  return (
    <>
      <UiPreview />
      {/* 830 px = the main column of board Zestaw at 1440, next to the buy panel. */}
      <Container className="pb-16">
        <div className="max-w-[830px]">
          <FpsList build="wampir" color="var(--c-wampir)" games={listed} table={table} />
        </div>
      </Container>
    </>
  )
}
