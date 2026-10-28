'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { Sigil } from '@/components/Sigil'
import { SourceLabel } from '@/components/SourceLabel'
import { ButtonLink } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import {
  compareQuery,
  compareView,
  MAX_SLOTS,
  MIN_SLOTS,
  nextBuild,
  QUICK_GAMES,
  REFRESH_RATES,
  slotOption,
  type CompareData,
  type CompareState,
  type RefreshRate,
} from '@/lib/compare'
import { RESOLUTIONS, RESOLUTION_LABELS, sourceOf, type Resolution } from '@/lib/fps'
import { routes } from '@/lib/nav'
import { zl } from '@/lib/pricing/format'
import { notifyStorage, readItem, storageKeys, writeItem } from '@/lib/storage'

const colorOf = (slug: string | null) => (slug ? `var(--c-${slug})` : 'var(--grom)')

/** Slugs saved by an earlier visit, if they are still on offer. */
function savedSlots(data: CompareData): string[] | null {
  try {
    const value: unknown = JSON.parse(readItem(storageKeys.compare) ?? 'null')
    if (!Array.isArray(value)) return null
    const known = value.filter(
      (s): s is string => typeof s === 'string' && data.builds.some((b) => b.slug === s),
    )
    const slots = [...new Set(known)].slice(0, MAX_SLOTS)
    return slots.length >= MIN_SLOTS ? slots : null
  } catch {
    return null
  }
}

/**
 * Porównywarka (spec. §9, boards Porownywarka / Porownywarka-telefon, `stany/tel-13`). All numbers
 * of the 16 builds are in `data`: every change is instant. The state lives in the address (the
 * link „Wyślij to porównanie” opens exactly this view) and the picked builds in `localStorage`
 * (the counter in the header; a visit without `?z=` returns to them).
 */
export function Compare({
  data,
  initial,
  siteUrl,
}: {
  data: CompareData
  initial: CompareState
  /** Absolute origin for the link that is sent (the same on the server and in the browser). */
  siteUrl: string
}) {
  const [state, setState] = useState<CompareState>(initial)
  const [showAll, setShowAll] = useState(false)
  const [copied, setCopied] = useState(false)
  const view = useMemo(() => compareView(data, state, showAll), [data, state, showAll])
  const query = compareQuery(state)

  const update = (patch: Partial<CompareState>) => {
    setState((s) => ({ ...s, ...patch }))
    setCopied(false)
  }

  // A visit without builds in the address returns to the ones picked last time: a new address,
  // so the server renders them (the page remounts this component with the new state).
  const router = useRouter()
  // While that navigation runs, this (default) state must not overwrite the saved builds.
  const restoring = useRef(false)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('z')) return
    const saved = savedSlots(data)
    if (!saved) return
    restoring.current = true
    router.replace(`${routes.compare}${compareQuery({ ...initial, slots: saved })}`)
  }, [data, initial, router])

  useEffect(() => {
    if (restoring.current) return
    if (window.location.search !== query) window.history.replaceState(null, '', query)
    if (writeItem(storageKeys.compare, JSON.stringify(state.slots))) notifyStorage()
  }, [query, state.slots])

  if (!view) return null
  const res = RESOLUTION_LABELS[state.resolution]
  const n = view.builds.length
  const pageUrl = new URL(`${routes.compare}${query}`, siteUrl).toString()

  const setSlot = (i: number, slug: string) => {
    const slots = [...state.slots]
    slots[i] = slug
    update({ slots })
  }
  const add = () => {
    const next = nextBuild(state.slots, data.builds)
    if (next) update({ slots: [...state.slots, next] })
  }
  const insertSuggestion = (slug: string) => {
    if (state.slots.length < MAX_SLOTS) return update({ slots: [...state.slots, slug] })
    // Full: the suggestion replaces the cheapest build (board `addSugg`).
    let lowest = 0
    view.builds.forEach((b, i) => {
      if (b.rank < view.builds[lowest]!.rank) lowest = i
    })
    setSlot(lowest, slug)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl)
      setCopied(true)
    } catch {
      // No clipboard (insecure context, refused): the address bar already holds the link.
      setCopied(false)
    }
  }
  // TODO(krystian): subject and text of the mail (not on the board).
  const mailHref = `mailto:?subject=${encodeURIComponent('Porównanie komputerów PRO-KOM Gaming')}&body=${encodeURIComponent(`Zobacz to porównanie: ${pageUrl}`)}`

  return (
    <>
      <div className="cmp-bar">
        <div className="wrap cmp-bar__in">
          <label className="cmp-field">
            <span>Gra</span>
            <span className="cmp-select">
              {/* Named on its own: the visible label is hidden on narrow screens (board). */}
              <select
                aria-label="Gra"
                value={state.game}
                onChange={(e) => update({ game: e.target.value })}
              >
                {data.games.map((g) => (
                  <option key={g.slug} value={g.slug}>
                    {g.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <div className="cmp-field">
            <span aria-hidden="true">Rozdzielczość</span>
            <Segmented
              label="Rozdzielczość"
              options={RESOLUTIONS.map((r) => ({ value: r, label: RESOLUTION_LABELS[r] }))}
              value={state.resolution}
              onChange={(resolution: Resolution) => update({ resolution })}
            />
          </div>
          <div className="cmp-field">
            <span aria-hidden="true">Odświeżanie monitora</span>
            <Segmented
              label="Odświeżanie monitora"
              options={REFRESH_RATES.map((hz) => ({ value: String(hz), label: `${hz} Hz` }))}
              value={String(state.hz)}
              onChange={(hz) => update({ hz: Number(hz) as RefreshRate })}
            />
          </div>
          <label className="cmp-diff">
            <input
              type="checkbox"
              checked={state.diff}
              onChange={(e) => update({ diff: e.target.checked })}
            />
            <i aria-hidden="true" />
            Tylko różnice
          </label>
        </div>
        <div className="wrap cmp-quick" role="group" aria-label="Popularne gry">
          {QUICK_GAMES.map((slug) => {
            const g = data.games.find((x) => x.slug === slug)
            if (!g) return null
            return (
              <button
                key={slug}
                type="button"
                className="chip"
                aria-pressed={state.game === slug}
                onClick={() => update({ game: slug })}
              >
                {g.name}
              </button>
            )
          })}
        </div>
      </div>

      <section className="cmp" aria-label="Porównanie">
        <div className="wrap">
          <div className={`cmp-slots cmp-slots--${n}`} style={{ '--n': n } as CSSProperties}>
            {view.builds.map((b, i) => {
              const num = view.numbers[i]
              const badge = view.badges[i]
              return (
                <article
                  key={`${i}-${b.slug}`}
                  className={`cmp-slot${view.top === i ? ' cmp-slot--top' : ''}`}
                  style={{ '--c': colorOf(b.slug) } as CSSProperties}
                >
                  <div className="cmp-slot__view">
                    <Image
                      className="cmp-slot__scene"
                      src={`/scenes/${b.key}-card.webp`}
                      alt=""
                      width={560}
                      height={320}
                    />
                    <span className="cmp-slot__fade" aria-hidden="true" />
                    {b.photo && (
                      <span className="cmp-slot__photo" aria-hidden="true">
                        <Image src={b.photo.src} alt="" width={240} height={273} />
                      </span>
                    )}
                    <span className="cmp-slot__sigil" aria-hidden="true">
                      <Sigil id={b.key} size={46} />
                    </span>
                    <span className="cmp-slot__tier">
                      Moc {b.tierRoman}
                      <em>{b.tierLabel}</em>
                    </span>
                    {n > MIN_SLOTS && (
                      <button
                        type="button"
                        className="cmp-slot__x"
                        aria-label={`Usuń ${b.accusative} z porównania`}
                        onClick={() => update({ slots: state.slots.filter((_, k) => k !== i) })}
                      >
                        ×
                      </button>
                    )}
                    {badge && (
                      <span className={`cmp-slot__badge cmp-slot__badge--${badge.tone}`}>
                        {badge.text}
                      </span>
                    )}
                  </div>
                  <div className="cmp-slot__body">
                    <label className="cmp-select cmp-select--sm">
                      <span className="sr-only">Zmień komputer w miejscu {i + 1}</span>
                      <select value={b.slug} onChange={(e) => setSlot(i, e.target.value)}>
                        {data.builds
                          .filter((o) => o.slug === b.slug || !state.slots.includes(o.slug))
                          .map((o) => (
                            <option key={o.slug} value={o.slug}>
                              {slotOption(o)}
                            </option>
                          ))}
                      </select>
                    </label>
                    <em className="lore">{b.epithet}</em>
                    <strong className="nm">{b.name}</strong>
                    <div className="cmp-slot__fps">
                      <b>
                        {num ? (view.capped ? String(view.game.fpsCap ?? num.fps) : num.fps) : '—'}
                      </b>
                      <span>
                        klatek, {view.game.name}, {res}
                      </span>
                      {num && <SourceLabel kind={num.kind} />}
                    </div>
                    <p className="cmp-slot__gift">
                      <b>{b.giftTitle}.</b> {b.gift}
                    </p>
                    <div className="cmp-slot__price">
                      <b>{zl(b.price)}</b>
                      <small>z montażem i wysyłką</small>
                    </div>
                    <div className="cmp-slot__cta">
                      <ButtonLink href={`${routes.inquiry}?zestaw=${b.slug}`}>
                        Zapytaj o {b.accusative}
                      </ButtonLink>
                      <Link className="lnk" href={`/zestawy/${b.slug}`}>
                        Szczegóły
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
            {n < MAX_SLOTS && (
              <button type="button" className="cmp-add" onClick={add}>
                <span aria-hidden="true">+</span>
                <b>Dodaj trzeci komputer</b>
                <small>Porównasz do trzech naraz</small>
              </button>
            )}
          </div>

          <div
            className={`cmp-verdict cmp-verdict--${view.verdict.tone}`}
            style={
              {
                '--c':
                  view.verdict.tone === 'low'
                    ? 'var(--cmp-low-verdict)'
                    : colorOf(view.verdict.color),
              } as CSSProperties
            }
            role="status"
          >
            <div className="cmp-verdict__key">
              Werdykt dla: {view.game.name}, {res}, monitor {state.hz} Hz
            </div>
            <h2 className="h">{view.verdict.title}</h2>
            <p>{view.verdict.text}</p>
            {view.verdict.more && <p className="cmp-verdict__more">{view.verdict.more}</p>}
            {view.verdict.suggest && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => insertSuggestion(view.verdict.suggest!)}
              >
                Wstaw {view.verdict.suggestName} do porównania
              </button>
            )}
            <details className="cmp-verdict__how">
              <summary>Jak to liczymy?</summary>
              <p>
                W grach e-sportowych sprawdzamy, czy średnia liczba klatek dorównuje odświeżaniu
                monitora. W grach fabularnych i premierach płynnie robi się od 60 klatek. Klatki
                pochodzą z niezależnych testów (TechPowerUp, ComputerBase, Wccftech, GameGPU) przy
                najwyższych ustawieniach, bez skalowania. Gdzie testu z daną kartą brak, przeliczamy
                z testów tej samej gry albo podajemy szacunek, i zawsze to oznaczamy.
              </p>
            </details>
          </div>

          <div className="cmp-chart">
            <div className="cmp-head">
              <h2 className="h">Klatki w Twojej grze</h2>
              <p>
                {view.game.name}, {res}, najwyższe ustawienia z testu. Punkt to średnia liczba
                klatek, linie to progi płynności i Twojego monitora.
              </p>
            </div>
            <div className="cmp-chart__plot">
              <div
                className="cmp-chart__line"
                style={{ '--x': view.chart.line60 } as CSSProperties}
              >
                <span>60 klatek, płynnie</span>
              </div>
              {view.chart.lineHz !== null && (
                <div
                  className="cmp-chart__line cmp-chart__line--hz"
                  style={{ '--x': view.chart.lineHz } as CSSProperties}
                >
                  <span>{state.hz} Hz, Twój monitor</span>
                </div>
              )}
              {view.builds.map((b, i) => {
                const point = view.chart.points[i]
                const num = view.numbers[i]
                return (
                  <div
                    key={`${i}-${b.slug}`}
                    className="cmp-chart__row"
                    style={{ '--c': colorOf(b.slug) } as CSSProperties}
                  >
                    <span className="cmp-chart__name">{b.name}</span>
                    <span className="cmp-chart__track" aria-hidden="true">
                      {point !== null && <i style={{ left: `${point}%` }} />}
                    </span>
                    <b>
                      {num ? (view.capped ? String(view.game.fpsCap ?? num.fps) : num.fps) : '—'}
                      {num && (
                        <span
                          className={`cmp-dot cmp-dot--${sourceOf(num.kind).tone}`}
                          title={sourceOf(num.kind).label}
                        >
                          <span className="sr-only">, {sourceOf(num.kind).label}</span>
                        </span>
                      )}
                    </b>
                  </div>
                )
              })}
            </div>
            {view.steps.length > 0 && (
              <ul className="cmp-steps">
                {view.steps.map((s) => (
                  <li
                    key={`${s.from}-${s.to}`}
                    style={{ '--c': colorOf(s.color) } as CSSProperties}
                  >
                    <span>
                      Z {s.from} na {s.to}
                    </span>
                    <b>{s.gain}</b>
                    <em>za dopłatę {s.extra}</em>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="cmp-matrix">
            <div className="cmp-head">
              <h2 className="h">Wszystkie gry naraz</h2>
              <p>
                Klatki w {res} dla każdej z {data.games.length} gier. Kolor mówi, czy będzie płynnie
                i czy komputer wykorzysta monitor {state.hz} Hz.
              </p>
            </div>
            <ul className="cmp-legend">
              <li className="cmp-legend--low">poniżej 60 klatek</li>
              <li className="cmp-legend--ok">płynnie, 60 i więcej</li>
              <li className="cmp-legend--full">wykorzystuje monitor {state.hz} Hz</li>
            </ul>
            <table className="cmp-table cmp-table--matrix" style={{ '--n': n } as CSSProperties}>
              <caption className="sr-only">Klatki we wszystkich grach, {res}</caption>
              <thead>
                <tr>
                  <th scope="col">Gra</th>
                  {view.builds.map((b, i) => (
                    <th
                      key={`${i}-${b.slug}`}
                      scope="col"
                      style={{ '--c': colorOf(b.slug) } as CSSProperties}
                    >
                      {b.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.matrix.map((row) => (
                  <tr key={row.game} className={row.selected ? 'cmp-row--sel' : undefined}>
                    <th scope="row">
                      {row.name}
                      <small>{row.kind}</small>
                    </th>
                    {row.cells.map((cell, i) => (
                      <td key={i}>
                        <span className={`cmp-cell cmp-cell--${cell.tone}`}>
                          {cell.value}
                          {cell.kind && (
                            <span
                              className={`cmp-dot cmp-dot--${sourceOf(cell.kind).tone}`}
                              title={sourceOf(cell.kind).label}
                            >
                              <span className="sr-only">, {sourceOf(cell.kind).label}</span>
                            </span>
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="lnk cmp-more" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Pokaż tylko popularne gry' : `Pokaż wszystkie ${data.games.length} gry`}
            </button>
          </div>

          <div className="cmp-spec">
            <div className="cmp-head">
              <h2 className="h">Podzespoły i to, co w cenie</h2>
              <p>
                Zaznaczyliśmy różnice. Wszystko, co pod spodem jest wspólne, dostajesz w każdym
                zestawie.
              </p>
            </div>
            <table className="cmp-table cmp-table--spec" style={{ '--n': n } as CSSProperties}>
              <caption className="sr-only">Podzespoły porównywanych komputerów</caption>
              <thead>
                <tr>
                  <td />
                  {view.builds.map((b, i) => (
                    <th
                      key={`${i}-${b.slug}`}
                      scope="col"
                      style={{ '--c': colorOf(b.slug) } as CSSProperties}
                    >
                      {b.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.spec.map((row) =>
                  'group' in row ? (
                    row.hidden ? null : (
                      <tr key={row.group} className="cmp-row--group">
                        <th scope="colgroup" colSpan={n + 1}>
                          {row.group}
                        </th>
                      </tr>
                    )
                  ) : row.hidden ? null : (
                    <tr key={row.label} className={row.same ? 'cmp-row--same' : undefined}>
                      <th scope="row">
                        {row.label}
                        {row.hint && <small>{row.hint}</small>}
                      </th>
                      {row.values.map((v, i) => (
                        <td
                          key={i}
                          className={
                            v.tone ? `cmp-spec--${v.tone.replace(' ', ' cmp-spec--')}` : undefined
                          }
                          style={{ '--c': colorOf(view.builds[i]!.slug) } as CSSProperties}
                        >
                          {v.text}
                          {v.tone === 'dif best' && <span className="sr-only"> (najwięcej)</span>}
                        </td>
                      ))}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="cmp-share">
            <div>
              <h2 className="h">Wyślij to porównanie</h2>
              <p>
                Link otworzy dokładnie ten widok: te same komputery, gra i monitor. Rodzic zobaczy
                to samo co Ty, bez zakładania konta.
              </p>
            </div>
            <div className="cmp-share__cta">
              <a className="btn" href={mailHref}>
                Wyślij mailem
              </a>
              <button type="button" className="btn btn--ghost" onClick={copy} aria-live="polite">
                {copied ? 'Skopiowano link' : 'Kopiuj link'}
              </button>
              <ButtonLink href={`${routes.inquiry}?z=${state.slots.join(',')}`} variant="ghost">
                Zapytaj o wszystkie naraz
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
