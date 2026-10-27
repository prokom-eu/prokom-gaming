import { Sigil } from '@/components/Sigil'
import type { HeroBuild, HeroTier } from '@/lib/home'

type Props = {
  tiers: HeroTier[]
  builds: Map<string, HeroBuild>
  activeTier: number
  onPick: (slug: string) => void
}

/** Board Main: the line fills up to the active medallion (8%, 20% … 92%, 100%). */
const progressOf = (index: number, count: number) => (index === count - 1 ? 100 : 8 + index * 12)

/** Nine medallions "Od Skrzata do Peruna" at the bottom of the hero (board Main, `.strip6`). */
export function TierStrip({ tiers, builds, activeTier, onPick }: Props) {
  const activeIndex = Math.max(
    0,
    tiers.findIndex((t) => t.tier === activeTier),
  )
  return (
    <nav className="hero-tiers" aria-label="Poziomy mocy">
      <p className="hero-tiers__cap">
        <em className="lore">Od Skrzata do Peruna</em>
        <small>im wyżej, tym więcej klatek</small>
      </p>
      <div
        className="hero-tiers__row"
        style={{ ['--p' as string]: `${progressOf(activeIndex, tiers.length)}%` }}
      >
        <span className="hero-tiers__line" aria-hidden="true" />
        {tiers.map((tier) => {
          const lead = builds.get(tier.lead)
          if (!lead) return null
          const names = tier.builds.map((slug) => builds.get(slug)?.name ?? slug).join(', ')
          return (
            <button
              key={tier.tier}
              type="button"
              className="hero-tiers__item"
              aria-pressed={tier.tier === activeTier}
              style={{ ['--tc' as string]: `var(--c-${tier.lead})` }}
              onClick={() => onPick(tier.lead)}
            >
              <span className="hero-tiers__medal" aria-hidden="true">
                <Sigil id={lead.key} size={54} />
              </span>
              {/* The visible text is the button's name (WCAG 2.5.3): "Moc I Skrzat FullHD". */}
              <span className="hero-tiers__text">
                <b>
                  <span className="sr-only">Moc </span>
                  {tier.roman}
                </b>
                <strong>{names}</strong>
                <em>{tier.resolutionLabel}</em>
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
