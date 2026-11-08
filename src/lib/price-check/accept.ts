import 'server-only'

import type { Payload } from 'payload'

import { matchCosts, type CostChange, type ParsedRow } from '../pricing/csv'
import { applyCostImport, loadImportData } from '../pricing/store'
import type { User } from '../../payload-types'
import type { CheckDiff } from './diff'

/**
 * „Przyjmij N propozycji” (panel spec §11, ADR-G007 §2 pt 8): the proposed market costs are
 * written the way the CSV import writes them — the same matching (option code, part model in
 * every level that uses it), the same transaction — and only to `market` items: an invoice cost
 * is never overwritten. The queue recomputes by itself; nothing is published here.
 */
export async function acceptProposals(
  payload: Payload,
  diff: CheckDiff,
  user: User,
): Promise<{ options: number; levels: number; skipped: number }> {
  const { options, levels } = await loadImportData(payload)
  // A cost changed since the check (by hand, an import, another report) is newer than the
  // market reading: that item is skipped, never overwritten with an old proposal (review P7).
  const optionCost = new Map(options.map((o) => [o.code, o.cost]))
  const partCosts = new Map<string, number[]>()
  for (const level of levels) {
    for (const c of level.components ?? []) {
      const key = c.internalModel.trim().toLowerCase()
      partCosts.set(key, [...(partCosts.get(key) ?? []), c.cost])
    }
  }
  const unchanged = (item: CheckDiff['items'][number]) =>
    item.itemType === 'option'
      ? optionCost.get(item.code) === item.cost
      : (partCosts.get(item.model.trim().toLowerCase()) ?? []).some((c) => c === item.cost)
  const all = diff.items.filter((i) => i.decision.kind === 'propose')
  const proposals = all.filter(unchanged)
  const rows: ParsedRow[] = proposals.map((item, index) => ({
    line: index + 1,
    // A part is matched by its model, like an import row: every level with it gets the cost.
    key: item.itemType === 'option' ? item.code : item.model,
    cost: item.decision.kind === 'propose' ? item.decision.newCost : item.cost,
  }))
  const preview = matchCosts(rows, options, levels)

  // Today's cost source per place (it may have changed since the check).
  const invoiceOption = new Set(
    (
      await payload.find({
        collection: 'options',
        where: { costSource: { equals: 'invoice' } },
        select: { code: true },
        depth: 0,
        pagination: false,
        overrideAccess: true,
      })
    ).docs.map((o) => o.id),
  )
  const levelDocs = await payload.find({
    collection: 'power-levels',
    select: { components: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const invoicePart = new Set<string>()
  for (const level of levelDocs.docs) {
    ;(level.components ?? []).forEach((c, index) => {
      if (c.costSource === 'invoice') invoicePart.add(`${level.id}:${index}`)
    })
  }

  let skipped = preview.errors.length + (all.length - proposals.length)
  const changes: CostChange[] = []
  for (const change of preview.changes) {
    const targets = change.targets.filter((t) =>
      t.kind === 'option' ? !invoiceOption.has(t.id) : !invoicePart.has(`${t.id}:${t.index}`),
    )
    if (targets.length < change.targets.length) skipped++
    if (targets.length > 0) changes.push({ ...change, targets })
  }
  if (changes.length === 0) return { options: 0, levels: 0, skipped }
  const written = await applyCostImport(payload, changes, user)
  return { ...written, skipped }
}
