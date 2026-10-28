'use client'

import { useState, type ReactNode } from 'react'

import { BottomSheet } from '@/components/BottomSheet'
import { IconSliders } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import {
  BUDGET_CHOICES,
  buildsWord,
  filtersQuery,
  KIND_CHOICES,
  matchesFilters,
  MONITOR_CHOICES,
  NO_FILTERS,
  sheetFilterCount,
  type BuildFacets,
  type BuildFilters,
} from '@/lib/builds'

export type BrowserItem = { slug: string; facets: BuildFacets; card: ReactNode }

type Props = {
  items: readonly BrowserItem[]
  /** From the address, read on the server: the first HTML is already filtered. */
  initial: BuildFilters
}

type Group = keyof BuildFilters

/**
 * Filters of „Wszystkie zestawy” (spec. §5, board Zestawy, `stany/tel-03`, `tel-04`). The cards
 * are rendered on the server and passed in; this component only decides which ones show. The
 * state lives in the address (`history.replaceState`, no reload, no new history entry per click),
 * so a filtered list can be sent as a link.
 *
 * Desktop: one bar with three groups and the count. Phone: the monitor chips stick to the top,
 * „Filtry” opens a sheet with all groups and „Pokaż N zestawów”.
 */
export function BuildsBrowser({ items, initial }: Props) {
  const [filters, setFilters] = useState<BuildFilters>(initial)
  const [sheetOpen, setSheetOpen] = useState(false)

  const shown = items.filter((item) => matchesFilters(item.facets, filters))
  const count = shown.length
  const inSheet = sheetFilterCount(filters)

  function update(next: BuildFilters) {
    setFilters(next)
    window.history.replaceState(null, '', `${window.location.pathname}${filtersQuery(next)}`)
  }

  function pick<G extends Group>(group: G, value: BuildFilters[G]) {
    update({ ...filters, [group]: value })
  }

  const groups = (idPrefix: string) => (
    <>
      <FilterGroup
        id={`${idPrefix}-monitor`}
        label="Monitor"
        choices={MONITOR_CHOICES}
        value={filters.monitor}
        onPick={(v) => pick('monitor', v)}
      />
      <FilterGroup
        id={`${idPrefix}-budget`}
        label="Budżet"
        choices={BUDGET_CHOICES}
        value={filters.budget}
        onPick={(v) => pick('budget', v)}
      />
      <FilterGroup
        id={`${idPrefix}-kind`}
        label="Rodzaj"
        choices={KIND_CHOICES}
        value={filters.kind}
        onPick={(v) => pick('kind', v)}
      />
    </>
  )

  return (
    <>
      <div className="bl-quick" role="group" aria-label="Monitor">
        <div className="bl-quick__chips">
          {MONITOR_CHOICES.map((c) => (
            <Chip
              key={c.label}
              pressed={filters.monitor === c.value}
              onClick={() => pick('monitor', c.value)}
            >
              {c.label}
            </Chip>
          ))}
        </div>
        <button
          type="button"
          className="bl-quick__more"
          aria-haspopup="dialog"
          // The badge is a grid box: spell the name out, so a reader says „Filtry, aktywne: 2”.
          aria-label={inSheet > 0 ? `Filtry, aktywne: ${inSheet}` : undefined}
          onClick={() => setSheetOpen(true)}
        >
          <IconSliders size={18} />
          Filtry
          {inSheet > 0 && <em aria-hidden="true">{inSheet}</em>}
        </button>
      </div>

      {/* One announcement for both layouts: the count in the desktop bar is hidden on a phone. */}
      <p className="sr-only" aria-live="polite">
        {count > 0 ? `${count} ${buildsWord(count)}` : 'Żaden zestaw nie pasuje do tych filtrów'}
      </p>

      <div className="wrap">
        <div className="bl-filters cut">
          {groups('d')}
          <p className="bl-count" aria-hidden="true">
            <b>{count}</b> {buildsWord(count)}
          </p>
        </div>

        {count > 0 ? (
          <ul className="bl-grid">
            {shown.map((item) => (
              <li key={item.slug}>{item.card}</li>
            ))}
          </ul>
        ) : (
          <div className="bl-empty cut">
            <p>Żaden zestaw nie pasuje do tych filtrów</p>
            <Button variant="ghost" onClick={() => update(NO_FILTERS)}>
              Wyczyść filtry
            </Button>
          </div>
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        label="Filtry"
        closeLabel="Zamknij filtry"
        headerStart={<b className="bl-sheet__title">Filtry</b>}
      >
        <div className="bl-sheet">
          {groups('m')}
          <Button size="lg" className="bl-sheet__go" onClick={() => setSheetOpen(false)}>
            Pokaż {count} {buildsWord(count)}
          </Button>
        </div>
      </BottomSheet>
    </>
  )
}

function FilterGroup<T extends string>({
  id,
  label,
  choices,
  value,
  onPick,
}: {
  id: string
  label: string
  choices: readonly { value: T | null; label: string }[]
  value: T | null
  onPick: (value: T | null) => void
}) {
  return (
    <div className="bl-fgp" role="group" aria-labelledby={id}>
      <span id={id}>{label}</span>
      <div>
        {choices.map((c) => (
          <Chip key={c.label} pressed={value === c.value} onClick={() => onPick(c.value)}>
            {c.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}
