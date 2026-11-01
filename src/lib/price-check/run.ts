import 'server-only'

import type { Payload } from 'payload'

import { catalogAtPublish } from '../pricing/catalog'
import { getEnv, priceCheckConfig } from '../env'
import { errorFields, log } from '../logger'
import { notify } from '../notify'
import { percent, zl } from '../pricing/format'
import { shopOf } from '../pricing/sources'
import { loadBatch, loadOffer } from '../pricing/store'
import { shopsOf } from '../../globals/PriceCheckSettings'
import { ClaudePriceReader, FakePriceReader, type CheckedItem, type PriceReader } from './claude'
import {
  computeDiff,
  type CheckDiff,
  type CheckItem,
  type ItemCategory,
  type OfferRow,
} from './diff'
import { decide, marketCost, staleCost, type CostMethod } from './market'
import { numbersOf, unknownNumbers } from './summary'
import { callCostUsd, estimateUsd, monthStart, overBudget, type CallUsage } from './usage'

/**
 * One price check (ADR-G007 §2, panel spec §11): (1) items with their offer links, (2) Claude
 * reads each offer page, (3) items without a valid offer are searched for (new links saved as
 * proposals), (4) market cost per item, (5) lib/pricing recomputes, (6) Claude describes the
 * numbers, (7) alarms. Nothing is published — „Przyjmij propozycje” in the report saves costs.
 * Progress, tokens and cost are written to `price-checks` as it goes.
 */

const MAX_MINUTES = 15
const CONCURRENCY = 4
/** At most this many searches per run (each costs money). */
const MAX_SEARCHES = 20

type Item = CheckItem & {
  checked: CheckedItem
  urls: { id: number; url: string }[]
}

class Stop extends Error {
  constructor(
    readonly status: 'budget' | 'failed',
    message: string,
  ) {
    super(message)
  }
}

export function readerFor(): PriceReader | null {
  const config = priceCheckConfig(getEnv())
  if (!config) return null
  return config.mode === 'fake' ? new FakePriceReader() : new ClaudePriceReader(config.apiKey)
}

export async function runPriceCheck(payload: Payload, checkId: number): Promise<string> {
  const check = await payload.findByID({
    collection: 'price-checks',
    id: checkId,
    depth: 0,
    overrideAccess: true,
  })
  if (check.status !== 'running') return check.status

  const save = (data: Record<string, unknown>) =>
    payload.update({
      collection: 'price-checks',
      id: checkId,
      data,
      depth: 0,
      overrideAccess: true,
    })

  const reader = readerFor()
  if (!reader) {
    await save({
      status: 'failed',
      finishedAt: new Date().toISOString(),
      error: 'Brak klucza ANTHROPIC_API_KEY.',
    })
    return 'failed'
  }

  const started = Date.now()
  const totals = { inputTokens: 0, outputTokens: 0, costUsd: 0, pagesRead: 0, searches: 0 }
  const settings = await payload.findGlobal({
    slug: 'price-check-settings',
    depth: 0,
    overrideAccess: true,
  })
  const shops = shopsOf(settings)
  const limit = settings.monthlyBudgetUsd ?? 20
  const spentBefore = await spentThisMonth(payload, checkId)

  /** Records the cost of finished calls; the budget is checked before each new one. */
  const spend = (usage: CallUsage[]) => {
    for (const u of usage) {
      totals.inputTokens += u.inputTokens + (u.cacheTokens ?? 0)
      totals.outputTokens += u.outputTokens
      totals.costUsd += callCostUsd(u)
      totals.searches += u.webSearches ?? 0
      totals.pagesRead += u.webFetches ?? 0
    }
  }
  const guard = (kind: 'read' | 'search' | 'summary') => {
    if (Date.now() - started > MAX_MINUTES * 60_000) {
      throw new Stop('failed', `Przekroczono ${MAX_MINUTES} min — zapisano postęp.`)
    }
    if (overBudget(spentBefore + totals.costUsd, estimateUsd(kind), limit)) {
      throw new Stop('budget', `Limit ${limit} USD na miesiąc — sprawdzanie przerwane.`)
    }
  }
  const progress = (step: string, value: number) =>
    save({ step, progress: Math.round(value), ...rounded(totals) }).catch(() => undefined)

  try {
    // (1) Items and their links.
    const items = await loadItems(payload)
    await save({ itemsTotal: items.length, step: 'Koszt zakupu' })
    const offers = new Map<string, OfferRow[]>()
    const offerOf = (item: Item) => offers.get(`${item.itemType}:${item.code}`) ?? []
    const record = async (
      item: Item,
      sourceId: number | null,
      url: string,
      method: 'fetch' | 'search',
    ) => {
      guard('read')
      const result = await reader.read(item.checked, url, shops)
      spend(result.usage)
      const r = result.reading
      const row: OfferRow = {
        url,
        shop: shopOf(url, shops) ?? '',
        price: r?.price_pln ?? null,
        available: r?.available ?? false,
        matched: r?.matches ?? false,
        fetchedAt: result.fetchedAt,
      }
      // Only a valid reading is an offer: an API error or a broken answer says nothing about the
      // shop, so it never makes an item „niedostępne” (no false alarm — review P7).
      if (result.note === 'ok') offers.set(`${item.itemType}:${item.code}`, [...offerOf(item), row])
      await payload.create({
        collection: 'price-observations',
        data: {
          check: checkId,
          itemType: item.itemType,
          itemCode: item.code,
          componentRole: item.itemType === 'component' ? item.category : null,
          url,
          shop: row.shop,
          title: r?.title.slice(0, 500) ?? null,
          pricePln: row.price,
          available: row.available,
          matched: row.matched,
          quote: r?.cited_text.slice(0, 200) ?? null,
          method,
          note: result.note === 'ok' ? r?.reason || null : result.note,
          observedAt: new Date().toISOString(),
        },
        depth: 0,
        overrideAccess: true,
      })
      if (sourceId !== null) {
        const ok = result.note === 'ok' && row.price !== null
        await payload.update({
          collection: 'price-sources',
          id: sourceId,
          data: ok
            ? { lastOk: new Date().toISOString(), lastError: null }
            : { lastError: result.note === 'ok' ? 'brak ceny' : result.note },
          depth: 0,
          overrideAccess: true,
        })
      }
    }

    // (2) Read every offer page, 4 at a time.
    const jobs = items.flatMap((item) => item.urls.map((u) => ({ item, ...u })))
    let done = 0
    await pool(jobs, CONCURRENCY, async (job) => {
      await record(job.item, job.id, job.url, 'fetch')
      done++
      if (done % 5 === 0) await progress('Sklepy', 10 + (done / Math.max(jobs.length, 1)) * 60)
    })

    // (3) Search for items without a usable offer (market items only — invoice costs stay).
    await progress('Sklepy: wyszukiwanie', 70)
    const method = (settings.costMethod ?? 'lowest') as CostMethod
    // Items with a proposal waiting to be switched on are skipped, and a known address is never
    // saved again — before, every run searched (and paid for) the same items and duplicated links.
    // An item whose active links failed (product gone, another variant) is still searched.
    const linked = await linkedItems(payload)
    const missing = items.filter(
      (i) =>
        i.costSource === 'market' &&
        marketCost(offerOf(i), method) === null &&
        !linked.pending.has(`${i.itemType}:${i.code}`),
    )
    let linksProposed = 0
    for (const item of rotate(missing, checkId * MAX_SEARCHES).slice(0, MAX_SEARCHES)) {
      guard('search')
      const found = await reader.search(item.checked, shops)
      spend(found.usage)
      for (const url of found.urls.filter((u) => !linked.urls.has(u)).slice(0, 2)) {
        linked.urls.add(url)
        // Proposed link: switched off until Krystian accepts it (ADR-G007 §2 pt 3).
        await payload
          .create({
            collection: 'price-sources',
            data: {
              itemType: item.itemType,
              itemCode: item.code,
              url,
              active: false,
              proposedByClaude: true,
            },
            depth: 0,
            overrideAccess: true,
          })
          .then(() => linksProposed++)
          .catch((error: unknown) => log.warn({ ...errorFields(error) }, 'proposed link refused'))
        await record(item, null, url, 'search')
      }
    }

    // (4)–(5) Market cost, decisions, recomputation in lib/pricing.
    await progress('Przeliczenie', 85)
    const outlier = settings.outlierPct ?? 0.25
    const decided = items.map((item) => {
      const market = marketCost(offerOf(item), method)
      return {
        ...item,
        market,
        decision: decide(
          item,
          market,
          outlier,
          offerOf(item).length,
          market !== null && staleCost(offerOf(item), method, new Date()),
        ),
        offers: offerOf(item),
      }
    })
    const diff: CheckDiff = { ...(await diffOf(payload, decided)), linksProposed }

    // (6) Summary from the numbers only, checked; one retry, else none.
    await progress('Raport i alarm', 92)
    let summary: string | null = null
    let stopNote: string | null = null
    const diffJson = JSON.stringify(summaryInput(diff))
    try {
      for (let attempt = 0; attempt < 2 && summary === null; attempt++) {
        guard('summary')
        const result = await reader.summarize(diffJson)
        spend(result.usage)
        if (
          result.text &&
          unknownNumbers(result.text, numbersOf(summaryInput(diff))).length === 0
        ) {
          summary = result.text
        }
      }
    } catch (error) {
      // The limit or the time ran out before the summary: the readings and the recomputation are
      // done and paid — keep the report, without the summary.
      if (!(error instanceof Stop)) throw error
      stopNote = error.message
    }

    await save({
      status: 'done',
      finishedAt: new Date().toISOString(),
      progress: 100,
      step: 'Raport i alarm',
      itemsFound: diff.totals.found,
      summary,
      diff,
      error: stopNote,
      ...rounded(totals),
    })

    // (7) Alarms.
    await alarm(payload, checkId, diff, settings)
    log.info(
      {
        checkId,
        found: diff.totals.found,
        proposals: diff.totals.proposals,
        costUsd: totals.costUsd,
      },
      'price check done',
    )
    return 'done'
  } catch (error) {
    const status = error instanceof Stop ? error.status : 'failed'
    const message = error instanceof Stop ? error.message : 'Błąd sprawdzania — szczegóły w logach.'
    if (!(error instanceof Stop))
      log.error({ ...errorFields(error), checkId }, 'price check failed')
    await save({ status, finishedAt: new Date().toISOString(), error: message, ...rounded(totals) })
    if (status === 'budget') {
      await notify(payload, {
        kind: 'budget',
        push: null,
        email: {
          // TODO(krystian): wording of the alarm (no board).
          subject: 'Sprawdzanie cen: przekroczony limit wydatków Claude',
          text: `${message}\nRaport: ${getEnv().SITE_URL}/admin/raporty-cen/${checkId}`,
        },
      }).catch(() => undefined)
    }
    return status
  }
}

const rounded = (t: {
  inputTokens: number
  outputTokens: number
  costUsd: number
  pagesRead: number
  searches: number
}) => ({
  ...t,
  costUsd: Math.round(t.costUsd * 10_000) / 10_000,
})

async function spentThisMonth(payload: Payload, exceptId: number): Promise<number> {
  const checks = await payload.find({
    collection: 'price-checks',
    where: {
      startedAt: { greater_than_equal: monthStart(new Date()) },
      id: { not_equals: exceptId },
    },
    select: { costUsd: true },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return checks.docs.reduce((sum, c) => sum + (c.costUsd ?? 0), 0)
}

async function pool<T>(list: readonly T[], size: number, work: (item: T) => Promise<void>) {
  let next = 0
  const workers = Array.from({ length: Math.min(size, list.length) }, async () => {
    while (next < list.length) {
      const item = list[next++]!
      await work(item)
    }
  })
  await Promise.all(workers)
}

/** Items with a proposal waiting to be switched on, and every known link address. */
async function linkedItems(payload: Payload) {
  const all = await payload.find({
    collection: 'price-sources',
    select: { itemType: true, itemCode: true, url: true, active: true, proposedByClaude: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return {
    /** Items with a Claude proposal still switched off. */
    pending: new Set(
      all.docs
        .filter((s) => !s.active && s.proposedByClaude)
        .map((s) => `${s.itemType}:${s.itemCode}`),
    ),
    urls: new Set(all.docs.map((s) => s.url)),
  }
}

/** The list started at `offset` (wrapping): each run searches the next items, not the same ones. */
function rotate<T>(list: readonly T[], offset: number): T[] {
  if (list.length === 0) return []
  const start = ((offset % list.length) + list.length) % list.length
  return [...list.slice(start), ...list.slice(0, start)]
}

/** Options and power-level parts (one per `partKey`) with their active offer links. */
async function loadItems(payload: Payload): Promise<Item[]> {
  const [options, levels, builds, sources] = await Promise.all([
    payload.find({
      collection: 'options',
      sort: 'id',
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'power-levels',
      sort: 'code',
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'builds',
      select: { name: true, level: true, case: true, cooler: true, ram: true, ssd: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'price-sources',
      where: { active: { equals: true } },
      select: { itemType: true, itemCode: true, url: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
  ])
  const idOf = (ref: number | { id: number }) => (typeof ref === 'number' ? ref : ref.id)
  const linksOf = (type: 'option' | 'component', code: string) =>
    sources.docs
      .filter((s) => s.itemType === type && s.itemCode === code)
      .map((s) => ({ id: s.id, url: s.url }))

  const items: Item[] = options.docs.map((o) => ({
    itemType: 'option',
    code: o.code,
    title: o.publicLabel,
    model: o.internalModel,
    category: o.type as ItemCategory,
    costSource: (o.costSource ?? 'market') as 'market' | 'invoice',
    cost: o.cost,
    costAtBatch: null,
    builds: builds.docs.filter((b) => idOf(b[o.type]) === o.id).map((b) => b.name),
    levels: [],
    checked: {
      publicLabel: o.publicLabel,
      internalModel: o.internalModel,
      ean: o.ean ?? null,
      previousCost: o.cost,
    },
    urls: linksOf('option', o.code),
  }))

  const parts = new Map<string, Item>()
  for (const level of levels.docs) {
    const usedBy = builds.docs.filter((b) => idOf(b.level) === level.id).map((b) => b.name)
    for (const c of level.components ?? []) {
      const key = c.partKey
      if (!key) continue
      const known = parts.get(key)
      if (known) {
        known.levels.push(level.code)
        known.builds.push(...usedBy.filter((n) => !known.builds.includes(n)))
        // One invoice entry makes the part „invoice”: its cost is never overwritten.
        if (c.costSource === 'invoice') known.costSource = 'invoice'
        continue
      }
      parts.set(key, {
        itemType: 'component',
        code: key,
        title: c.publicLabel,
        model: c.internalModel,
        category: c.role as ItemCategory,
        costSource: (c.costSource ?? 'market') as 'market' | 'invoice',
        cost: c.cost,
        costAtBatch: null,
        builds: [...usedBy],
        levels: [level.code],
        checked: {
          publicLabel: c.publicLabel,
          internalModel: c.internalModel,
          ean: c.ean ?? null,
          previousCost: c.cost,
        },
        urls: linksOf('component', key),
      })
    }
  }
  return [...items, ...parts.values()]
}

async function diffOf(
  payload: Payload,
  items: Parameters<typeof computeDiff>[0]['items'],
): Promise<CheckDiff> {
  const [offer, batch, levels] = await Promise.all([
    loadOffer(payload),
    loadBatch(payload),
    payload.find({
      collection: 'power-levels',
      select: { code: true, components: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
  ])
  if (!batch) throw new Error('no published batch')
  const rows = await payload.find({
    collection: 'published-prices',
    where: { batch: { equals: batch.snapshot.batch } },
    select: { itemType: true, itemCode: true, costAtPublish: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const batchRows = rows.docs.map((r) => ({ ...r, costAtPublish: r.costAtPublish ?? null }))
  const atBatch = new Map(batchRows.map((r) => [`${r.itemType}:${r.itemCode}`, r.costAtPublish]))
  return computeDiff({
    catalog: offer.catalog,
    snapshot: batch.snapshot,
    builds: offer.builds.filter((b) => b.offerStatus === 'published'),
    levelParts: new Map(
      levels.docs.map((l) => [
        l.code,
        (l.components ?? []).map((c) => ({ partKey: c.partKey ?? '', cost: c.cost })),
      ]),
    ),
    batchCatalog: catalogAtPublish(offer.catalog, batchRows),
    items: items.map((i) => ({
      ...i,
      costAtBatch: i.itemType === 'option' ? (atBatch.get(`option:${i.code}`) ?? null) : null,
    })),
  })
}

/** What Claude gets for the summary: the numbers of the report, no shop pages. */
function summaryInput(diff: CheckDiff) {
  return {
    totals: diff.totals,
    changes: diff.items
      .filter((i) => i.decision.kind !== 'same')
      .map((i) => ({
        pozycja: i.title,
        rodzaj: i.category,
        decyzja: i.decision.kind,
        koszt: i.cost,
        rynek: i.market,
        zmiana: 'change' in i.decision ? Math.round(i.decision.change * 1000) / 1000 : null,
        cenaTeraz: i.priceNow,
        cenaNowa: i.priceNew,
        zestawy: i.builds,
      })),
    zestawy: diff.builds.map((b) => ({
      zestaw: b.name,
      cenaTeraz: b.priceNow,
      cenaNowa: b.priceNew,
      zmiana: b.change,
      marzaTeraz: b.marginNow === null ? null : Math.round(b.marginNow * 1000) / 1000,
      marzaPo: b.marginAfter === null ? null : Math.round(b.marginAfter * 1000) / 1000,
    })),
  }
}

/** Step 7: e-mail (and push) when the minimum breaks, a build part is unavailable or a cost jumps. */
async function alarm(
  payload: Payload,
  checkId: number,
  diff: CheckDiff,
  settings: {
    alertMinMargin?: boolean | null
    alertUnavailable?: boolean | null
    alertChangePct?: number | null
  },
) {
  const reasons: string[] = []
  const { lowestNow, minMargin } = diff.totals
  if (settings.alertMinMargin !== false && lowestNow !== null && lowestNow < minMargin) {
    reasons.push(
      `Najsłabsza konfiguracja przy cenach ze strony: ${percent(lowestNow)} (minimum ${percent(minMargin)}).`,
    )
  }
  if (settings.alertUnavailable !== false) {
    for (const i of diff.items.filter(
      (i) => i.decision.kind === 'unavailable' && i.builds.length > 0,
    )) {
      reasons.push(`Niedostępne w sklepach: ${i.title} (zestawy: ${i.builds.join(', ')}).`)
    }
  }
  const threshold = settings.alertChangePct ?? 0.05
  for (const i of diff.items) {
    const d = i.decision
    // An old page copy alarms nobody: its price may be weeks old (review of fix/p7-odczyt-ofert).
    const fresh = d.kind === 'propose' || (d.kind === 'manual' && !d.stale)
    if (fresh && Math.abs(d.change) > threshold) {
      reasons.push(
        `${i.title}: koszt ${zl(i.cost)} → ${zl(d.kind === 'propose' ? d.newCost : d.market)} (${percent(d.change, true)}).`,
      )
    }
  }
  if (reasons.length === 0) return
  await notify(payload, {
    kind: 'price_report',
    push: { kind: 'price_report', check: checkId },
    email: {
      // TODO(krystian): wording of the alarm e-mail (no board).
      subject: 'Raport cen: zmiany wymagające uwagi',
      text: [
        'Sprawdzanie cen znalazło zmiany wymagające uwagi:',
        '',
        ...reasons.map((r) => `- ${r}`),
        '',
        `Raport: ${getEnv().SITE_URL}/admin/raporty-cen/${checkId}`,
        'Nic nie zmieniło się na stronie — nowe ceny zatwierdzasz w panelu.',
      ].join('\n'),
    },
  }).catch((error: unknown) =>
    log.error({ ...errorFields(error), checkId }, 'price alarm not queued'),
  )
}
