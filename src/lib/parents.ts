/**
 * „Dla rodziców” (runda v2 §5): „Ile trzeba wydać?” in three bands, each the cheapest fitting
 * creatures with their published price (from `lib/pricing` via the hero data — never a cost).
 * Browser-safe: public names and sell prices only.
 */
import type { HeroBuild } from './home'

export type BudgetBand = {
  /** What the child plays, in a parent's words. */
  title: string
  /** Lowest published price in the band. */
  from: number
  /** The creatures at that price level, cheapest first (at most two). */
  picks: { slug: string; name: string; price: number }[]
}

/** The three bands of §5: e-sport and Minecraft, new games in FullHD, 2K. */
const BANDS: readonly { title: string; fits: (b: HeroBuild) => boolean }[] = [
  // Tier I: the lightest games run smoothly on any FullHD monitor.
  { title: 'Minecraft, Roblox, Fortnite i e-sport', fits: (b) => b.tier === 1 },
  // Tier III: new games on high settings in FullHD (the board's „FullHD wysokie”).
  { title: 'Nowe gry w FullHD na wysokich ustawieniach', fits: (b) => b.tier === 3 },
  // Made for a 2K monitor (the level's target resolution).
  { title: 'Gry na monitorze 2K', fits: (b) => b.resolution === 'qhd' },
]

/** The bands from the offer; a band with no priced creature is left out. */
export function budgetBands(builds: readonly HeroBuild[]): BudgetBand[] {
  const out: BudgetBand[] = []
  for (const band of BANDS) {
    const priced = builds
      .filter((b): b is HeroBuild & { price: number } => b.price !== null && band.fits(b))
      .sort((a, b) => a.price - b.price)
    if (priced.length === 0) continue
    out.push({
      title: band.title,
      from: priced[0].price,
      picks: priced.slice(0, 2).map((b) => ({ slug: b.slug, name: b.name, price: b.price })),
    })
  }
  return out
}
