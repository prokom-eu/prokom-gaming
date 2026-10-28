'use client'

import Link from 'next/link'
import { useState, type CSSProperties } from 'react'

import { ButtonLink } from '@/components/ui/Button'
import { inquiryHref, LIGHTS, tunedNote, type LightKey, type TuneChoice } from '@/lib/buildPage'
import { routes } from '@/lib/nav'
import { zl } from '@/lib/pricing/format'
import type { Config } from '@/lib/pricing/types'

type Props = {
  slug: string
  name: string
  accusative: string
  cpu: string
  gpu: string
  ramType: string
  /** „czerwone światło” — the default light. */
  ownLight: string
  config: Config
  /** The build's published price; the tuned one adds the surcharges of the picks. */
  price: number
  ram: TuneChoice[]
  ssd: TuneChoice[]
}

const signed = (v: number) => (v === 0 ? 'w zestawie' : v > 0 ? `+${zl(v)}` : `−${zl(-v)}`)

/**
 * „Dopasuj {istotę} pod siebie” (spec. §6 pt 7, board Zestaw `.dp7`): RAM, SSD and light colour.
 * Gets only finished choices with their surcharges (computed on the server from the published
 * batch, `tuneChoices()`), so the price here is the build price + surcharges — the same sum as
 * the configurator and `/api/inquiry`. „Zapytaj o tę wersję” carries the codes and the colour.
 */
export function TuneBuild(props: Props) {
  const ownRam = props.ram.find((c) => c.own)
  const ownSsd = props.ssd.find((c) => c.own)
  const [ram, setRam] = useState(ownRam?.code ?? props.config.ram)
  const [ssd, setSsd] = useState(ownSsd?.code ?? props.config.ssd)
  const [light, setLight] = useState<LightKey | null>(null)

  const ramPick = props.ram.find((c) => c.code === ram) ?? ownRam
  const ssdPick = props.ssd.find((c) => c.code === ssd) ?? ownSsd
  const diff = (ramPick?.surcharge ?? 0) + (ssdPick?.surcharge ?? 0)
  const lightLabel = LIGHTS.find((l) => l.key === light)?.label ?? props.ownLight

  return (
    <section className="bp-tune" aria-labelledby="bp-tune-h">
      <div className="wrap bp-tune__grid">
        <div>
          <h2 id="bp-tune-h" className="h">
            Dopasuj {props.accusative} pod siebie
          </h2>
          <p className="bp-tune__lead">
            Moc zostaje ta sama. Zmieniasz to, co wynika z Twojego grania: pamięć, miejsce na gry i
            kolor światła. Cena przelicza się od razu.
          </p>

          <Choices label="Pamięć RAM" choices={props.ram} value={ram} onPick={setRam} />
          <Choices label="Dysk" choices={props.ssd} value={ssd} onPick={setSsd} />

          <fieldset className="bp-tune__group">
            <legend>Światło</legend>
            <div className="bp-lights">
              <button
                type="button"
                aria-pressed={light === null}
                onClick={() => setLight(null)}
                style={{ '--lc': `var(--c-${props.slug})` } as CSSProperties}
              >
                <i aria-hidden="true" />
                <small>Istoty</small>
              </button>
              {LIGHTS.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  aria-pressed={light === l.key}
                  onClick={() => setLight(l.key)}
                  style={{ '--lc': `var(--light-${l.key})` } as CSSProperties}
                >
                  <i aria-hidden="true" />
                  <small>{l.label}</small>
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="bp-tune__sum" aria-label="Twoja wersja">
          <small>Twoja wersja</small>
          <b className="nm">{props.name}</b>
          <ul>
            <li>
              <span>Procesor</span>
              <em>{props.cpu}</em>
            </li>
            <li>
              <span>Karta</span>
              <em>{props.gpu}</em>
            </li>
            <li>
              <span>Pamięć</span>
              <em>{ramPick ? `${ramPick.label} ${props.ramType}` : '—'}</em>
            </li>
            <li>
              <span>Dysk</span>
              <em>{ssdPick ? `${ssdPick.label} NVMe` : '—'}</em>
            </li>
            <li>
              <span>Światło</span>
              <em>{lightLabel}</em>
            </li>
          </ul>
          <div className="bp-tune__price" aria-live="polite">
            <b>{zl(props.price + diff)}</b>
            <span>{tunedNote(diff, light, zl)}</span>
          </div>
          <ButtonLink
            className="bp-tune__ask"
            size="lg"
            href={inquiryHref(props.slug, props.config, { ram, ssd, light })}
          >
            Zapytaj o tę wersję
          </ButtonLink>
          <Link className="lnk" href={`${routes.configurator}?zestaw=${props.slug}`}>
            Więcej zmian w konfiguratorze
          </Link>
        </aside>
      </div>
    </section>
  )
}

function Choices({
  label,
  choices,
  value,
  onPick,
}: {
  label: string
  choices: TuneChoice[]
  value: string
  onPick: (code: string) => void
}) {
  if (choices.length === 0) return null
  return (
    <fieldset className="bp-tune__group">
      <legend>{label}</legend>
      <div className="bp-opts">
        {choices.map((c) => (
          <button
            key={c.code}
            type="button"
            aria-pressed={c.code === value}
            onClick={() => onPick(c.code)}
          >
            <b>{c.label}</b>
            <small>{signed(c.surcharge)}</small>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
