import type { SearchHit } from '../inquiries/search'

/** What the panel search returns (P8). Admin only: parts and options carry internal models. */
export type PanelSearchResult = {
  inquiries: SearchHit[]
  builds: { slug: string; name: string }[]
  options: { id: number; label: string; detail: string }[]
  parts: PartHit[]
}

export type PartHit = { levelId: number; label: string; detail: string }

type Level = {
  id: number
  code: string
  tierRoman?: string | null
  components?: { role: string; publicLabel: string; internalModel?: string | null }[] | null
}

/** Every word of the query appears in the text (like Payload's `like`, case-insensitive). */
export function matchesAll(text: string, query: string): boolean {
  const hay = text.toLocaleLowerCase('pl')
  return query
    .toLocaleLowerCase('pl')
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word))
}

/**
 * Parts of the power levels that match the query, one hit per model: the same part in several
 * levels shows once, with the levels listed („Moc IV, Moc V”). The database finds the levels;
 * this picks the matching components inside them.
 */
export function partHits(levels: readonly Level[], query: string): PartHit[] {
  const byModel = new Map<string, { levelId: number; label: string; tiers: string[] }>()
  for (const level of levels) {
    for (const c of level.components ?? []) {
      const model = c.internalModel || c.publicLabel
      if (!matchesAll(`${c.internalModel ?? ''} ${c.publicLabel}`, query)) continue
      const tier = level.tierRoman ? `Moc ${level.tierRoman}` : level.code
      const hit = byModel.get(model)
      if (hit) {
        if (!hit.tiers.includes(tier)) hit.tiers.push(tier)
      } else {
        byModel.set(model, { levelId: level.id, label: model, tiers: [tier] })
      }
    }
  }
  return [...byModel.values()].map((h) => ({
    levelId: h.levelId,
    label: h.label,
    detail: h.tiers.join(', '),
  }))
}
