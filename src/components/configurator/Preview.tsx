import Image from 'next/image'
import type { CSSProperties } from 'react'

import { Sigil } from '@/components/Sigil'
import { SourceLabel } from '@/components/SourceLabel'
import { Button, ButtonLink } from '@/components/ui/Button'
import type { BuildMatch, ConfiguratorState } from '@/lib/configurator'
import { zl } from '@/lib/pricing/format'

import type { ConfiguratorView } from './view'

/**
 * The preview (board `.k2-side`, spec. §7): the chosen case with the light colour, the level, the
 * parts with prices, FPS in the chosen games, the ready-build tag and the price. Desktop only; on
 * a phone the bar above the tab bar and the summary step carry the same information.
 */
export function Preview({
  state,
  view,
  match,
  last,
  askHref,
  onSummary,
}: {
  state: ConfiguratorState
  view: ConfiguratorView
  match: BuildMatch | null
  last: boolean
  askHref: string
  onSummary: () => void
}) {
  const caseItem = view.option(state.config.case)
  const name = match?.sideName ?? view.build?.name ?? ''

  return (
    <aside className="cf-side" aria-label="Twoja konfiguracja">
      <div className="cf-sb cut">
        <div className="cf-sb__stage" style={{ '--glow': view.lightColor } as CSSProperties}>
          <span className="cf-sb__glow" aria-hidden="true" />
          {caseItem?.photo && (
            <Image
              className="cf-sb__img"
              src={caseItem.photo.src}
              alt={caseItem.label}
              width={444}
              height={505}
            />
          )}
        </div>
        <div className="cf-sb__h">
          {view.build && (
            <span className="cf-sb__sigil" aria-hidden="true">
              <Sigil id={view.build.key} size={40} />
            </span>
          )}
          <div>
            <b className="nm">{name}</b>
            <span>
              {view.level.tierLabel}
              {view.level.variant ? ` · ${view.level.variant}` : ''}
            </span>
          </div>
        </div>
        <ul className="cf-sb__l">
          {view.lines.map((l) => (
            <li key={l.key}>
              <span>{l.label}</span>
              <em>{l.value}</em>
              <b>{l.price}</b>
            </li>
          ))}
        </ul>
        {view.fps.length > 0 && (
          <div className="cf-sb__fps">
            <b>Klatki w Twoich grach</b>
            {view.fps.map((f) => (
              <div key={f.slug} className="cf-fr">
                <span>{f.name}</span>
                <b>{f.cell ? `${f.cell.fps} kl./s` : '—'}</b>
                <i aria-hidden="true">
                  <s style={{ width: `${f.bar}%` }} />
                </i>
                {f.cell && <SourceLabel kind={f.cell.kind} />}
              </div>
            ))}
            <small>{view.fpsNote}</small>
          </div>
        )}
        <div className="cf-sb__p" aria-live="polite">
          {match && (
            <span className={match.exact ? 'cf-tag is-exact' : 'cf-tag'}>{match.short}</span>
          )}
          <b>{zl(view.price)}</b>
          <small>Windows 11, montaż, test i wysyłka w cenie</small>
          {last ? (
            <ButtonLink className="cf-wide" href={askHref}>
              Zapytaj o tę konfigurację
            </ButtonLink>
          ) : (
            <Button className="cf-wide" onClick={onSummary}>
              Przejdź do podsumowania
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
}
