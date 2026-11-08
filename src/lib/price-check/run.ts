import 'server-only'

import type { Payload } from 'payload'

import { catalogAtPublish } from '../pricing/catalog'
import { getEnv, priceCheckConfig } from '../env'
import { errorFields, log } from '../logger'
import { notify } from '../notify'
import { percent, zl } from '../pricing/format'
import { CENEO, ceneoProductId, ceneoUrl, onePerShop, shopOf } from '../pricing/sources'
import { loadBatch, loadOffer } from '../pricing/store'
import { shopsOf } from '../../globals/PriceCheckSettings'
import { parseCeneo, titleMatches, trustedOffers, type CeneoPage } from './ceneo'
import { ClaudePriceReader, FakePriceReader, type CheckedItem, type PriceReader } from './claude'
import {
  computeDiff,
  type CheckDiff,
  type CheckItem,
  type ItemCategory,
  type OfferRow,
} from './diff'
import { autoEnable, decide, marketCost, staleCost, type CostMethod } from './market'
import { numbersOf, summaryInput, unknownNumbers } from './summary'
import { callCostUsd, estimateUsd, monthStart, overBudget, type CallUsage } from './usage'

/**
 * One price check (ADR-G007 §2, panel spec §11): (1) items with their offer links, (2) the
 * server reads each Ceneo product page (trusted shops' offers, no Claude — ADR-G011) and Claude
 * reads each shop's offer page, (3) items without a Ceneo page are searched on Ceneo, then items
 * still without a valid offer in the shops (new links saved as proposals), (4) market cost per item, (5) lib/pricing recomputes, (6) Claude describes the
 * numbers, (7) alarms. Nothing is published — „Przyjmij propozycje” in the report saves costs.
 * Progress, tokens and cost are written to `price-checks` as it goes.
 */

const MAX_MINUTES = 30
/** No new search starts after this — the report is still written, the rest waits for the next run. */
const SEARCH_MINUTES = 20
const CONCURRENCY = 4
/** At most this many items searched per run (each costs money; the monthly limit still applies). */
const MAX_SEARCHES = 100
/**
 * Of those, at most this many on Ceneo, so items Ceneo does not have are still searched in the
 * shops in the same run (the first run looks up every item on Ceneo).
 */
const MAX_CENEO_SEARCHES = 70
/** Reading the saved Ceneo pages stops after this — the shops' pages are read either way. */
const CENEO_MINUTES = 10
/** This many Ceneo pages in a row not there = Ceneo blocks or is down: skipped for this run. */
const CENEO_FAILS = 5
/**
 * A running check is saved this often even while a long call waits, so a run whose process died
 * is told apart within minutes (`SILENT_MINUTES` in scheduler.ts — keep it well above this).
 */
const HEARTBEAT_SECONDS = 30
/** The note of a Ceneo search that found nothing: that item is not searched again for a while. */
// TODO(krystian): wording (no board).
export const CENEO_NOT_FOUND = 'Ceneo: nie znaleziono strony produktu'
const NOT_FOUND_DAYS = 14

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
  return config.mode === 'fake'
    ? new FakePriceReader()
    : new ClaudePriceReader(config.apiKey, getEnv().SITE_URL)
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
  // Each save moves `updatedAt`: the sign that this process still runs the check.
  const heartbeat = setInterval(() => {
    void save(rounded(totals)).catch(() => undefined)
  }, HEARTBEAT_SECONDS * 1000)
  heartbeat.unref()

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
    ): Promise<OfferRow | null> => {
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
      return result.note === 'ok' ? row : null
    }

    // Ceneo pages one after another, `pageDelayMs` apart, whichever worker asks (ADR-G011).
    let gate: Promise<unknown> = Promise.resolve()
    let ceneoFails = 0
    let ceneoNote: string | null = null
    const ceneoDown = () => ceneoFails >= CENEO_FAILS
    const loadCeneo = (url: string): Promise<CeneoPage | null> => {
      const turn = gate.then(async () => {
        if (Date.now() - started > MAX_MINUTES * 60_000) {
          throw new Stop('failed', `Przekroczono ${MAX_MINUTES} min — zapisano postęp.`)
        }
        if (ceneoDown()) return null
        const html = await reader.page(url)
        totals.pagesRead++
        await new Promise((resolve) => setTimeout(resolve, reader.pageDelayMs))
        ceneoFails = html === null ? ceneoFails + 1 : 0
        if (ceneoDown()) {
          // TODO(krystian): wording (no board).
          ceneoNote ??= 'Ceneo nie odpowiada — pominięte do następnego sprawdzenia.'
          log.warn({ checkId }, 'ceneo skipped: pages not there')
        }
        return html === null ? null : parseCeneo(html)
      })
      gate = turn.catch(() => undefined)
      return turn
    }
    /**
     * The trusted shops' offers of a Ceneo page as offers of the item (only when `use`: a page
     * not yet confirmed as the product is shown in the observations, never priced).
     */
    const recordCeneo = async (
      item: Item,
      sourceId: number | null,
      url: string,
      page: CeneoPage | null,
      matched: boolean,
      use: boolean,
      method: 'fetch' | 'search',
    ): Promise<OfferRow[]> => {
      const now = new Date()
      const rows: OfferRow[] = (page ? trustedOffers(page, shops, now) : []).map((o) => ({
        url,
        shop: o.shop,
        price: o.price,
        available: o.available,
        matched,
        fetchedAt: now.toISOString(),
        via: 'ceneo',
      }))
      if (use && rows.length > 0) {
        offers.set(`${item.itemType}:${item.code}`, [...offerOf(item), ...rows])
      }
      // TODO(krystian): wording of the notes (no board).
      const note =
        page === null
          ? 'Ceneo: strona niedostępna'
          : rows.length === 0
            ? 'Ceneo: brak ofert zaufanych sklepów'
            : matched
              ? 'Ceneo'
              : 'Ceneo: tytuł strony nie zgadza się z modelem'
      const observed = rows.length > 0 ? rows : [null]
      for (const row of observed) {
        await payload.create({
          collection: 'price-observations',
          data: {
            check: checkId,
            itemType: item.itemType,
            itemCode: item.code,
            componentRole: item.itemType === 'component' ? item.category : null,
            url,
            shop: row?.shop ?? CENEO,
            title: page?.title?.slice(0, 500) ?? null,
            pricePln: row?.price ?? null,
            available: row?.available ?? false,
            matched,
            method,
            note,
            observedAt: now.toISOString(),
          },
          depth: 0,
          overrideAccess: true,
        })
      }
      if (sourceId !== null) {
        await payload.update({
          collection: 'price-sources',
          id: sourceId,
          data:
            rows.length > 0
              ? { lastOk: now.toISOString(), lastError: null }
              : { lastError: note.replace(/^Ceneo: /, '') },
          depth: 0,
          overrideAccess: true,
        })
      }
      return rows
    }

    // (2a) Ceneo pages of the items — the main source, free (ADR-G011).
    const isCeneo = (u: { url: string }) => ceneoProductId(u.url) !== null
    const ceneoJobs = items.flatMap((item) =>
      item.urls.filter(isCeneo).map((u) => ({ item, ...u })),
    )
    let done = 0
    const total = Math.max(items.flatMap((i) => i.urls).length, 1)
    for (const job of ceneoJobs) {
      if (ceneoDown()) break
      if (Date.now() - started > CENEO_MINUTES * 60_000) {
        // TODO(krystian): wording (no board).
        ceneoNote ??= 'Część stron Ceneo poczeka do następnego sprawdzenia (limit czasu).'
        break
      }
      const page = await loadCeneo(job.url)
      // A page not there leaves the link alone (`recordCeneo` notes the error) unless Ceneo is
      // down as a whole — then nothing is written for the rest.
      if (page === null && ceneoDown()) break
      await recordCeneo(job.item, job.id, job.url, page, true, true, 'fetch')
      done++
      if (done % 5 === 0) await progress('Ceneo', 10 + (done / total) * 60)
    }

    // (2b) Every shop's offer page, read by Claude, 4 at a time — except a shop whose usable offer
    // (available, with a price) the item's Ceneo page gave already: the same price, paid twice.
    // An offer Ceneo shows as not available is checked in the shop itself.
    const fromCeneo = (item: Item, url: string) =>
      offerOf(item).some(
        (o) =>
          o.via === 'ceneo' && o.available && o.price !== null && o.shop === shopOf(url, shops),
      )
    const jobs = items.flatMap((item) =>
      item.urls.filter((u) => !isCeneo(u) && !fromCeneo(item, u.url)).map((u) => ({ item, ...u })),
    )
    await pool(jobs, CONCURRENCY, async (job) => {
      await record(job.item, job.id, job.url, 'fetch')
      done++
      if (done % 5 === 0) await progress('Sklepy', 10 + (done / total) * 60)
    })

    // (3) Search for items without a usable offer (market items only — invoice costs stay).
    await progress('Sklepy: wyszukiwanie', 70)
    const method = (settings.costMethod ?? 'lowest') as CostMethod
    // Items with a proposal waiting to be switched on are skipped, and a known address is never
    // saved again — before, every run searched (and paid for) the same items and duplicated links.
    // An item whose active links failed (product gone, another variant) is still searched.
    const linked = await linkedItems(payload)
    let linksProposed = 0
    let linksEnabled = 0
    let searchNote: string | null = null
    let budgetHit = false
    let searched = 0
    const outlierPct = settings.outlierPct ?? 0.25
    const stopSearch = (error: unknown) => {
      if (!(error instanceof Stop)) throw error
      if (error.status === 'budget') budgetHit = true
      searchNote ??= error.message
    }
    const timeUp = () => {
      if (Date.now() - started <= SEARCH_MINUTES * 60_000) return false
      // TODO(krystian): wording (no board).
      searchNote ??= 'Część pozycji poczeka na wyszukanie do następnego sprawdzenia (limit czasu).'
      return true
    }
    const propose = async (item: Item, url: string, active: boolean) => {
      await payload
        .create({
          collection: 'price-sources',
          data: {
            itemType: item.itemType,
            itemCode: item.code,
            url,
            active,
            proposedByClaude: true,
            ...(active ? { lastOk: new Date().toISOString() } : {}),
          },
          depth: 0,
          overrideAccess: true,
        })
        .then(() => {
          linksProposed++
          if (active) linksEnabled++
        })
        .catch((error: unknown) => log.warn({ ...errorFields(error) }, 'proposed link refused'))
    }

    // (3a) Every market item without a Ceneo page (none saved, not „not found” lately) is looked
    // up on Ceneo. A page switches itself on when its title is the model (`titleMatches`) and its
    // cheapest trusted offer is close to the cost (`autoEnable`); otherwise it waits for Krystian.
    const ceneoQueue = rotate(
      items.filter(
        (i) =>
          i.costSource === 'market' &&
          !linked.ceneo.has(`${i.itemType}:${i.code}`) &&
          !linked.notFound.has(`${i.itemType}:${i.code}`),
      ),
      checkId * MAX_SEARCHES,
    ).slice(0, MAX_CENEO_SEARCHES)
    await pool(ceneoQueue, CONCURRENCY, async (item) => {
      if (searchNote !== null || timeUp() || ceneoDown()) return
      try {
        guard('search')
      } catch (error) {
        stopSearch(error)
        return
      }
      const found = await reader.searchCeneo(item.checked)
      spend(found.usage)
      searched++
      // A failed search (API error, broken answer) says nothing about Ceneo: tried again next run.
      if (!found.ok) return
      const candidates = found.urls.filter((u) => !linked.urls.has(u))
      let chosen: { url: string; page: CeneoPage; matched: boolean } | null = null
      try {
        for (const url of candidates) {
          const page = await loadCeneo(url)
          // A page not there, or with no offers and another title (a block page, a moved
          // product), is never proposed — the item is searched again next run.
          if (page === null) continue
          const matched = titleMatches(item.model, page.title)
          if (!matched && page.offers.length === 0) continue
          if (matched) {
            chosen = { url, page, matched }
            break
          }
          chosen ??= { url, page, matched }
        }
      } catch (error) {
        stopSearch(error)
        return
      }
      if (chosen === null && (found.urls.length > 0 || ceneoDown())) return
      if (chosen === null) {
        // Nothing on Ceneo: remembered, so the next runs do not pay for the same search.
        await payload.create({
          collection: 'price-observations',
          data: {
            check: checkId,
            itemType: item.itemType,
            itemCode: item.code,
            componentRole: item.itemType === 'component' ? item.category : null,
            url: `https://www.${CENEO}/`,
            shop: CENEO,
            method: 'search',
            note: CENEO_NOT_FOUND,
            observedAt: new Date().toISOString(),
          },
          depth: 0,
          overrideAccess: true,
        })
        return
      }
      // Another worker may have saved the same page meanwhile (an option and a part).
      if (linked.urls.has(chosen.url)) return
      linked.urls.add(chosen.url)
      linked.ceneo.add(`${item.itemType}:${item.code}`)
      const best = trustedOffers(chosen.page, shops, new Date()).find((o) => o.available)
      const confirmed =
        chosen.matched &&
        best !== undefined &&
        autoEnable({ matched: true, price: best.price }, item.cost, outlierPct)
      await recordCeneo(item, null, chosen.url, chosen.page, chosen.matched, confirmed, 'search')
      await propose(item, chosen.url, confirmed)
      if (searched % 3 === 0) {
        await progress('Ceneo: wyszukiwanie', 70 + (searched / Math.max(ceneoQueue.length, 1)) * 8)
      }
    })

    // (3b) Items still without a usable offer are searched in the shops themselves.
    const missing = items.filter(
      (i) =>
        i.costSource === 'market' &&
        marketCost(offerOf(i), method) === null &&
        !linked.pending.has(`${i.itemType}:${i.code}`),
    )
    // At most MAX_SEARCHES paid searches per run, Ceneo (up to MAX_CENEO_SEARCHES) and shops.
    const queue = rotate(missing, checkId * MAX_SEARCHES).slice(
      0,
      Math.max(MAX_SEARCHES - searched, 0),
    )
    let shopSearched = 0
    await pool(queue, CONCURRENCY, async (item) => {
      if (searchNote !== null || timeUp()) return
      try {
        guard('search')
      } catch (error) {
        // The limit: stop searching, keep what is read — the report is still written.
        stopSearch(error)
        return
      }
      const found = await reader.search(item.checked, shops)
      spend(found.usage)
      for (const url of onePerShop(found.urls, linked.urls, shops)) {
        // Another worker may have saved the same page meanwhile (an option and a part).
        if (linked.urls.has(url)) continue
        linked.urls.add(url)
        let row: OfferRow | null
        try {
          row = await record(item, null, url, 'search')
        } catch (error) {
          // The limit or the time: save nothing unread — the item is searched again next run.
          stopSearch(error)
          linked.urls.delete(url)
          break
        }
        // A link switches itself on when its reading confirmed the same product and a price close
        // to the cost (ADR-G007, 1.11.2026 addition) — not on the model's word alone; others wait
        // for Krystian. Prices still go through „Do zatwierdzenia”: nothing reaches the site.
        const confirmed = row !== null && autoEnable(row, item.cost, outlierPct)
        await propose(item, url, confirmed)
      }
      shopSearched++
      if (shopSearched % 3 === 0) {
        await progress('Sklepy: wyszukiwanie', 78 + (shopSearched / Math.max(queue.length, 1)) * 7)
      }
    })

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
    const diff: CheckDiff = {
      ...(await diffOf(payload, decided)),
      linksProposed,
      linksEnabled,
    }

    // (6) Summary from the numbers only, checked; one retry, else none.
    await progress('Raport i alarm', 92)
    let summary: string | null = null
    let stopNote: string | null = null
    const { input, names } = summaryInput(diff)
    const allowed = numbersOf(input)
    try {
      for (let attempt = 0; attempt < 2 && summary === null; attempt++) {
        guard('summary')
        const result = await reader.summarize(JSON.stringify(input))
        spend(result.usage)
        if (!result.text) continue
        const unknown = unknownNumbers(result.text, allowed, names)
        if (unknown.length === 0) summary = result.text
        // Numbers only (no text): which ones the model made up, for the next diagnosis.
        else log.warn({ checkId, attempt, unknown: unknown.slice(0, 10) }, 'summary rejected')
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
      error: [...new Set([ceneoNote, searchNote, stopNote].filter(Boolean))].join(' ') || null,
      ...rounded(totals),
    })

    // (7) Alarms.
    await alarm(payload, checkId, diff, settings)
    if (budgetHit) await budgetAlarm(payload, checkId, searchNote ?? '')
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
    if (status === 'budget') await budgetAlarm(payload, checkId, message)
    return status
  } finally {
    clearInterval(heartbeat)
  }
}

/** The monthly limit stopped the run (whole or only its search): e-mail Krystian. */
async function budgetAlarm(payload: Payload, checkId: number, message: string) {
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

/**
 * `work` on the list, `size` at a time. After the first error no worker takes another item — a
 * failed run must not go on paying for calls in the background (review of the full search).
 */
async function pool<T>(list: readonly T[], size: number, work: (item: T) => Promise<void>) {
  let next = 0
  let aborted = false
  const workers = Array.from({ length: Math.min(size, list.length) }, async () => {
    while (!aborted && next < list.length) {
      const item = list[next++]!
      try {
        await work(item)
      } catch (error) {
        aborted = true
        throw error
      }
    }
  })
  await Promise.all(workers)
}

/**
 * Items with a proposal waiting to be switched on, items with a Ceneo page (on or off), items
 * not found on Ceneo in the last `NOT_FOUND_DAYS`, and every known link address.
 */
async function linkedItems(payload: Payload) {
  const [all, notFound] = await Promise.all([
    payload.find({
      collection: 'price-sources',
      select: { itemType: true, itemCode: true, url: true, active: true, proposedByClaude: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'price-observations',
      where: {
        note: { equals: CENEO_NOT_FOUND },
        observedAt: {
          greater_than: new Date(Date.now() - NOT_FOUND_DAYS * 86_400_000).toISOString(),
        },
      },
      select: { itemType: true, itemCode: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
  ])
  const key = (s: { itemType: string; itemCode: string }) => `${s.itemType}:${s.itemCode}`
  return {
    ceneo: new Set(all.docs.filter((s) => ceneoProductId(s.url) !== null).map(key)),
    notFound: new Set(notFound.docs.map(key)),
    /** Items with a Claude proposal of a shop page still switched off (a Ceneo one does not count). */
    pending: new Set(
      all.docs
        .filter((s) => !s.active && s.proposedByClaude && ceneoProductId(s.url) === null)
        .map((s) => `${s.itemType}:${s.itemCode}`),
    ),
    // Ceneo addresses in one form (`ceneo.pl/1`, `www.ceneo.pl/1;…` are the same page).
    urls: new Set(all.docs.map((s) => canonical(s.url))),
  }
}

/** A Ceneo product page as `https://www.ceneo.pl/<id>`; any other address as is. */
function canonical(url: string): string {
  const id = ceneoProductId(url)
  return id === null ? url : ceneoUrl(id)
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
