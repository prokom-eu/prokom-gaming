'use client'

import { useState } from 'react'

import { marginStatus, percentShort, signedZl, zl } from '../../lib/pricing/format'
import { Chip, type Tone } from '../ui/Chip'
import { Icon } from '../ui/icons'
import { MarginBar } from '../ui/MarginBar'
import { Seg } from '../ui/Seg'
import type { BuildCard, Monitor, OfferStatus } from './load'
import styles from './builds.module.css'

type MonitorFilter = 'all' | Monitor
type Sort = 'price' | 'margin' | 'name'

const MONITORS: { value: MonitorFilter; label: string }[] = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'fullhd', label: 'FullHD' },
  { value: 'qhd', label: '2K' },
  { value: 'uhd', label: '4K' },
]

const SORTS: { value: Sort; label: string }[] = [
  { value: 'price', label: 'Cena' },
  { value: 'margin', label: 'Marża' },
  { value: 'name', label: 'Nazwa' },
]

export const STATUS: Record<OfferStatus, { tone: Tone; label: string }> = {
  published: { tone: 'ok', label: 'na stronie' },
  draft: { tone: 'gold', label: 'szkic' },
  hidden: { tone: 'mu', label: 'ukryty' },
}

/**
 * „Gotowe zestawy” in the browser (panel spec §9, board Zestawy): monitor filter (from the
 * level's „Filtry Monitor”), sorting and the margin at the batch's or today's costs. Cards on
 * every width; one column on a phone.
 */
export function BuildsBoard({
  cards,
  minMargin,
  warnMargin,
  editBase,
  competitors = {},
}: {
  cards: BuildCard[]
  minMargin: number
  warnMargin: number
  editBase: string
  /** Competitors' prices typed in the settings (P7), by build slug. */
  competitors?: Record<string, { name: string; price: number }>
}) {
  const [monitor, setMonitor] = useState<MonitorFilter>('all')
  const [sort, setSort] = useState<Sort>('price')
  const [today, setToday] = useState(false)

  const figures = (c: BuildCard) => (today ? c.today : c.batch)
  const count = (m: MonitorFilter) =>
    m === 'all' ? cards.length : cards.filter((c) => c.monitors.includes(m)).length
  const order = (a: BuildCard, b: BuildCard) =>
    sort === 'name'
      ? a.name.localeCompare(b.name, 'pl')
      : sort === 'margin'
        ? (figures(a).margin ?? -Infinity) - (figures(b).margin ?? -Infinity)
        : (a.price ?? Infinity) - (b.price ?? Infinity)
  const shown = cards.filter((c) => monitor === 'all' || c.monitors.includes(monitor)).sort(order)

  return (
    <>
      <div className={styles.bar}>
        <Seg
          label="Monitor"
          options={MONITORS.map((m) => ({
            value: m.value,
            label: m.value === 'all' ? `${m.label} ${count('all')}` : m.label,
          }))}
          value={monitor}
          onChange={setMonitor}
        />
        <div className={styles.barRight}>
          <span className={styles.mu} aria-hidden="true">
            Sortuj
          </span>
          <Seg label="Sortuj" options={SORTS} value={sort} onChange={setSort} />
          <label className={styles.switch}>
            <span className="pn-tog">
              <input
                type="checkbox"
                role="switch"
                checked={today}
                onChange={(e) => setToday(e.target.checked)}
              />
              <span aria-hidden="true" />
            </span>
            marża przy dzisiejszych kosztach
          </label>
        </div>
      </div>

      <ul className={styles.grid}>
        {shown.map((c) => {
          const f = figures(c)
          const tone = marginStatus(f.margin, minMargin, warnMargin)
          return (
            <li key={c.slug} className={`pn-card ${styles.card}`}>
              <div className={styles.head}>
                <span className={styles.sigilBox}>
                  <span
                    className="pn-sigil"
                    aria-hidden="true"
                    style={{
                      ['--sigil' as string]: `url(/sigils/${c.sigil}-plain.svg)`,
                      color: `var(--c-${c.slug}, var(--p-gold))`,
                    }}
                  />
                </span>
                <span>
                  <h2 className={styles.name}>{c.name}</h2>
                  <small className={styles.mu}>{c.tier}</small>
                </span>
              </div>
              <p className={styles.price}>
                <b>{zl(c.price)}</b>
                <small>koszt {zl(f.cost)}</small>
              </p>
              <div className={styles.chips}>
                <Chip tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Chip>
              </div>
              <div className={styles.margin}>
                <MarginBar margin={f.margin} minMargin={minMargin} warnMargin={warnMargin} />
                <Chip tone={tone}>{percentShort(f.margin)}</Chip>
              </div>
              <dl className={styles.recipe}>
                <dt>Poziom</dt>
                <dd>{c.recipe.level}</dd>
                <dt>Obudowa</dt>
                <dd>{c.recipe.case}</dd>
                <dt>Chłodzenie</dt>
                <dd>{c.recipe.cooler}</dd>
                <dt>RAM i dysk</dt>
                <dd>{c.recipe.ramSsd}</dd>
              </dl>
              {competitors[c.slug] && c.price !== null ? (
                <p className={styles.rival}>
                  <span>
                    {competitors[c.slug]!.name}: {zl(competitors[c.slug]!.price)}
                  </span>
                  {/* Ours minus theirs: dearer than the competitor in red (board Zestawy). */}
                  <b
                    className={
                      c.price > competitors[c.slug]!.price ? styles.dearer : styles.cheaper
                    }
                  >
                    {signedZl(c.price - competitors[c.slug]!.price)}
                  </b>
                </p>
              ) : null}
              <a
                className={`pn-btn ${styles.edit}`}
                href={`${editBase}/${c.slug}`}
                aria-label={`Edytuj: ${c.name}`}
              >
                <Icon name="note" />
                Edytuj
              </a>
            </li>
          )
        })}
      </ul>
    </>
  )
}
