import type { CheckDiff } from '../../lib/price-check/diff'

/** „Ceny na rynku” (Pulpit, panel spec §3 pt 5): average cost change per kind in the last report. */
export type MarketRow = { label: string; change: number; items: number }

const LABEL: Record<CheckDiff['items'][number]['category'], string> = {
  ram: 'RAM',
  ssd: 'Dyski',
  gpu: 'Karty graficzne',
  cpu: 'Procesory',
  mobo: 'Płyty główne',
  psu: 'Zasilacze',
  case: 'Obudowy',
  cooler: 'Chłodzenia',
}

/** Items with a market cost, grouped by kind; the biggest moves first. Pure. */
export function marketChanges(diff: CheckDiff): MarketRow[] {
  const groups = new Map<string, number[]>()
  for (const item of diff.items) {
    if (item.market === null || !(item.cost > 0)) continue
    const label = LABEL[item.category]
    groups.set(label, [...(groups.get(label) ?? []), (item.market - item.cost) / item.cost])
  }
  return [...groups.entries()]
    .map(([label, changes]) => ({
      label,
      change: changes.reduce((a, c) => a + c, 0) / changes.length,
      items: changes.length,
    }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
}
