/**
 * What a price check costs in the Claude API (ADR-G007 §4): every call records its tokens and
 * searches, the run sums them into `price-checks.costUsd`, the monthly limit adds those up.
 * Rates of the Anthropic price list (checked in P7, 01.11.2026 — Claude API skill, cached
 * 2026-10-06): change them here when the price list changes.
 */

export const READ_MODEL = 'claude-haiku-5-5'
export const SEARCH_MODEL = 'claude-sonnet-5-5'

type Rate = {
  input: number
  output: number
  longPromptTokens?: number
  longInput?: number
  longOutput?: number
}

/** USD per 1 million tokens. Haiku 5.5: a dearer rate card above 100K prompt tokens. */
export const RATES: Record<string, Rate> = {
  [READ_MODEL]: {
    input: 0.1,
    output: 0.5,
    longPromptTokens: 100_000,
    longInput: 0.5,
    longOutput: 2.5,
  },
  [SEARCH_MODEL]: { input: 2, output: 10 },
}

/** Web search: 10 USD per 1000 searches; web fetch: tokens only. */
export const SEARCH_USD = 0.01

export type CallUsage = {
  model: string
  inputTokens: number
  outputTokens: number
  /** Cache reads and writes, billed like input here (no `cache_control` is set today). */
  cacheTokens?: number
  webSearches?: number
  webFetches?: number
}

export function callCostUsd(usage: CallUsage): number {
  const rate = RATES[usage.model]
  // An unknown model is priced like the dearest one we use: the limit must not be fooled.
  const r = rate ?? RATES[SEARCH_MODEL]!
  const prompt = usage.inputTokens + (usage.cacheTokens ?? 0)
  const long = r.longPromptTokens !== undefined && prompt > r.longPromptTokens
  const input = long ? r.longInput! : r.input
  const output = long ? r.longOutput! : r.output
  return (
    (prompt * input + usage.outputTokens * output) / 1_000_000 +
    (usage.webSearches ?? 0) * SEARCH_USD
  )
}

/** Rough upper estimate of one call before making it (the budget check, ADR-G007 §4). */
export function estimateUsd(kind: 'read' | 'search' | 'summary'): number {
  switch (kind) {
    case 'read':
      // One page (~25K tokens) and a short JSON answer.
      return callCostUsd({ model: READ_MODEL, inputTokens: 30_000, outputTokens: 800 })
    case 'search':
      // Up to 5 searches (one per shop), their results and up to 3 turns of `pause_turn` (each
      // resends the context).
      return callCostUsd({
        model: SEARCH_MODEL,
        inputTokens: 150_000,
        outputTokens: 1_500,
        webSearches: 5,
      })
    case 'summary':
      return callCostUsd({ model: SEARCH_MODEL, inputTokens: 15_000, outputTokens: 1_500 })
  }
}

/** Would this call go over the monthly limit (spent this month + this run so far + estimate)? */
export function overBudget(spentUsd: number, estimate: number, limitUsd: number): boolean {
  return spentUsd + estimate > limitUsd
}

/** Start of the current month in Polish time, as an ISO instant (the limit counts per month). */
export function monthStart(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)
  const year = parts.find((p) => p.type === 'year')!.value
  const month = parts.find((p) => p.type === 'month')!.value
  // Midnight of the 1st in Warsaw: try both offsets (CET/CEST) and keep the one that is the 1st.
  for (const offset of ['+01:00', '+02:00']) {
    const candidate = new Date(`${year}-${month}-01T00:00:00${offset}`)
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Warsaw',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(candidate)
    if (
      day.find((p) => p.type === 'day')?.value === '01' &&
      day.find((p) => p.type === 'hour')?.value === '00'
    ) {
      return candidate.toISOString()
    }
  }
  return new Date(`${year}-${month}-01T00:00:00Z`).toISOString()
}
