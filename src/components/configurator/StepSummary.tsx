import type { RefObject } from 'react'

import { SaveConfigButton } from '@/components/account/SaveConfigButton'
import { Sigil } from '@/components/Sigil'
import { IconBars, IconMail } from '@/components/icons'
import { PROMISES } from '@/components/promises'
import { ButtonLink } from '@/components/ui/Button'
import type { LightKey } from '@/lib/buildPage'
import {
  OTHER_PART_MAX,
  stateQuery,
  type BuildMatch,
  type ConfiguratorState,
} from '@/lib/configurator'
import { routes } from '@/lib/nav'
import { zl } from '@/lib/pricing/format'

import { LightPicker } from './LightPicker'
import type { ConfiguratorView } from './view'

/**
 * Step 6 (board `show5`): the ready-build match, the parts with their prices, the total and the
 * actions. Decision of Krystian (28.10.2026): no order form here — „Zapytaj o tę konfigurację”
 * goes to `/zapytanie?k=…` (G12), which owns contact data and consent.
 */
export function StepSummary({
  headingRef,
  state,
  view,
  match,
  askHref,
  siteUrl,
  other,
  onOther,
  onLight,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>
  state: ConfiguratorState
  view: ConfiguratorView
  match: BuildMatch | null
  askHref: string
  siteUrl: string
  other: string
  onOther: (text: string) => void
  onLight: (light: LightKey | null) => void
}) {
  const link = new URL(
    `${routes.configurator}?${stateQuery({ ...state, step: 'podsumowanie' })}`,
    siteUrl,
  ).toString()

  return (
    <div className="cf-step">
      <h2 ref={headingRef} tabIndex={-1} className="h">
        Podsumowanie
      </h2>
      <p className="cf-mut">
        Składamy ręcznie w Rabce-Zdroju, testujemy kilka godzin pod obciążeniem i dołączamy metrykę
        z wynikami.
      </p>

      {match && (
        <div className={match.exact ? 'cf-match cut is-exact' : 'cf-match cut'}>
          {view.build && (
            <span className="cf-match__sigil" aria-hidden="true">
              <Sigil id={view.build.key} size={46} />
            </span>
          )}
          <div>
            <b>{match.title}</b>
            <span>{match.text}</span>
          </div>
        </div>
      )}

      <dl className="cf-sum">
        {view.lines.map((l) => (
          <div key={l.key} className="cf-sum__row">
            <dt>{l.label}</dt>
            <dd>{l.value}</dd>
            <dd className="cf-sum__p">{l.price}</dd>
          </div>
        ))}
        <div className="cf-sum__row">
          <dt>Światło</dt>
          <dd>{view.lightLabel}</dd>
          <dd className="cf-sum__p">bez dopłaty</dd>
        </div>
        <div className="cf-sum__row is-total">
          <dt>Razem</dt>
          <dd>z Windows 11, montażem, testem i wysyłką</dd>
          <dd className="cf-sum__p">{zl(view.price)}</dd>
        </div>
      </dl>

      <ul className="cf-promises">
        {PROMISES.map(({ icon: Icon, text }) => (
          <li key={text}>
            <Icon size={18} />
            {text}
          </li>
        ))}
      </ul>

      <LightPicker value={state.light} ownColor={`var(--c-${view.level.build})`} onPick={onLight} />

      <label className="cf-lbl" htmlFor="cf-other">
        Chcesz obudowę albo chłodzenie, których nie ma na liście?
      </label>
      <textarea
        id="cf-other"
        className="cf-ta"
        rows={3}
        maxLength={OTHER_PART_MAX}
        placeholder="Napisz model, a potwierdzimy cenę i dostępność mailem"
        value={other}
        onChange={(e) => onOther(e.target.value)}
      />

      <div className="cf-fin">
        <ButtonLink size="lg" href={askHref}>
          Zapytaj o tę konfigurację
        </ButtonLink>
        <a className="btn btn--ghost" href={parentMail(view, link)}>
          <IconMail size={18} />
          Wyślij rodzicowi
        </a>
        {/* The comparison works on builds: the closest one stands in for this configuration. */}
        {view.build && (
          <ButtonLink variant="ghost" href={`${routes.compare}?z=${view.build.slug}`}>
            <IconBars size={18} />
            Dodaj do porównania
          </ButtonLink>
        )}
        <SaveConfigButton
          config={state.config}
          light={state.light}
          label={`Moc ${view.level.tier}, ${view.optionLabel(state.config.case)}`}
        />
      </div>
      {/* TODO(krystian): the label „albo SMS-em” is ours, not from the board (as on the build page). */}
      <p className="cf-sms">
        <a href={parentSms(view, link)}>albo SMS-em</a>
      </p>
    </div>
  )
}

/**
 * „Wyślij rodzicowi”: a message from the visitor's own mail or phone with the parts, the price and
 * the link to this configuration (spec. §6 pt 3 — the same as on the build page).
 * TODO(krystian): wording of the subject and the text (working text).
 */
function parentText(view: ConfiguratorView, link: string): string {
  const parts = view.lines
    .filter((l) => l.key !== 'service')
    .map((l) => `${l.label}: ${l.value}`)
    .join('\n')
  return `Komputer do gier z konfiguratora PRO-KOM Gaming (na bazie: ${view.build?.name ?? view.level.tierLabel}).
${parts}
Cena: ${zl(view.price)} z montażem, Windows 11 i wysyłką.

Konfiguracja: ${link}`
}

function parentMail(view: ConfiguratorView, link: string): string {
  const subject = 'Komputer do gier z konfiguratora — PRO-KOM Gaming'
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(parentText(view, link))}`
}

/** `sms:?&body=` — the form both Android and iOS read. */
function parentSms(view: ConfiguratorView, link: string): string {
  return `sms:?&body=${encodeURIComponent(parentText(view, link))}`
}
