import { IconEye } from '@/components/icons'
import { Sigil } from '@/components/Sigil'
import { SourceLabel } from '@/components/SourceLabel'
import { ButtonLink } from '@/components/ui/Button'
import { RESOLUTION_LABELS } from '@/lib/fps'
import { dateText, HERO_GAMES, siblingsText, type HeroBuild } from '@/lib/home'
import { zl } from '@/lib/pricing/format'

type Props = {
  build: HeroBuild
  /** Creatures of the same tier, in card order (the switcher). */
  siblings: HeroBuild[]
  pricedAt: string | null
  /** Changes on every switch, so the card blocks replay their entry. */
  animationKey: string | null
  onPick: (slug: string) => void
}

/** Creature card at the right of the hero (board Main, `.card6`); below the medallions on a phone. */
export function HeroCard({ build, siblings, pricedAt, animationKey, onPick }: Props) {
  const resolution = RESOLUTION_LABELS[build.resolution]
  const fresh = animationKey ? ' is-new' : ''
  return (
    <aside className="hero-card" aria-label={`${build.name}: Moc ${build.tierRoman}`}>
      <span className="hero-card__mark" aria-hidden="true">
        <Sigil id={build.key} size={220} />
      </span>
      <div className="hero-card__head">
        <span className="hero-card__tier">
          Moc {build.tierRoman}, {build.tierLabel}
        </span>
        <small>{siblingsText(siblings.length)}</small>
      </div>
      {siblings.length > 1 && (
        <div className="hero-card__tabs" role="group" aria-label="Komputery na tym poziomie mocy">
          {siblings.map((s) => (
            <button
              key={s.slug}
              type="button"
              className="hero-card__tab"
              aria-pressed={s.slug === build.slug}
              aria-label={`${s.name}: ${s.look}`}
              style={{ ['--mc' as string]: `var(--c-${s.slug})` }}
              onClick={() => onPick(s.slug)}
            >
              <Sigil id={s.key} ring={false} size={34} />
              <b>{s.name}</b>
            </button>
          ))}
        </div>
      )}
      <p className="hero-card__look">
        <IconEye size={14} />
        <span>Obudowa {build.look}</span>
      </p>
      <div key={`do-${animationKey}`} className={`hero-card__do${fresh}`}>
        {build.heroTitle && <b>{build.heroTitle}</b>}
        {build.heroText && <p>{build.heroText}</p>}
      </div>
      <dl key={`st-${animationKey}`} className={`hero-card__specs${fresh}`}>
        {(
          [
            ['Procesor', build.cpu],
            ['Karta graficzna', build.gpu],
            ['Pamięć', build.ram],
            ['Dysk', build.disk],
          ] as const
        ).map(([label, value]) =>
          value ? (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ) : null,
        )}
        {HERO_GAMES.map((game, i) => {
          const cell = build.fps[i]
          if (!cell) return null
          return (
            <div key={game.slug}>
              <dt>
                {game.name}, {resolution}
              </dt>
              <dd className="hero-card__fps">
                {cell.fps} <small>FPS</small>
              </dd>
              <dd className="hero-card__src">
                <SourceLabel kind={cell.kind} />
              </dd>
            </div>
          )
        })}
      </dl>
      <div className="hero-card__buy">
        {build.price !== null && (
          <div>
            <b>{zl(build.price)}</b>
            <small>z montażem, Windows 11 i wysyłką</small>
          </div>
        )}
        <ButtonLink href={`/zestawy/${build.slug}`}>Poznaj {build.accusative}</ButtonLink>
      </div>
      {pricedAt && (
        <p className="hero-card__note">Cena z {dateText(pricedAt)}, zdjęcie poglądowe.</p>
      )}
    </aside>
  )
}
