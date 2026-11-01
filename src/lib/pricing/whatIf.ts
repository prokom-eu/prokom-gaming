/**
 * „Co jeśli?” of the prices centre (panel spec §8): shift the cost of a group of parts and see the
 * margins of the ready builds at the prices on the site today. A simulation only — nothing is
 * saved and no price changes. Pure and client-safe: it runs in the panel's browser on cost data
 * sent to the panel only (never to the site).
 */

export const WHAT_IF_GROUPS = ['cpu', 'gpu', 'ram', 'ssd', 'rest'] as const
export type WhatIfGroup = (typeof WHAT_IF_GROUPS)[number]

/** Relative cost change per group, e.g. `{ ram: 0.08 }` = RAM 8% dearer. */
export type WhatIfShifts = Partial<Record<WhatIfGroup, number>>

/** Slider range of the panel: −15% … +25% (panel spec §8). */
export const WHAT_IF_MIN = -0.15
export const WHAT_IF_MAX = 0.25

export type WhatIfBuild = {
  name: string
  /** Price of the build on the site today (published prices). */
  price: number
  /** Cost per group; `fixed` = the service, which no slider moves. */
  costs: Record<WhatIfGroup | 'fixed', number>
}

export type WhatIfResult = {
  averageMargin: number | null
  weakest: { name: string; margin: number } | null
  belowWarn: number
  belowMin: number
}

export function whatIf(
  builds: readonly WhatIfBuild[],
  shifts: WhatIfShifts,
  { warnMargin, minMargin }: { warnMargin: number; minMargin: number },
): WhatIfResult {
  let sum = 0
  let weakest: WhatIfResult['weakest'] = null
  let belowWarn = 0
  let belowMin = 0
  for (const build of builds) {
    let cost = build.costs.fixed
    for (const group of WHAT_IF_GROUPS) cost += build.costs[group] * (1 + (shifts[group] ?? 0))
    const margin = 1 - cost / build.price
    sum += margin
    if (!weakest || margin < weakest.margin) weakest = { name: build.name, margin }
    // The same rule as the guard: under the floor means "not at least the floor".
    if (!(margin >= warnMargin)) belowWarn++
    if (!(margin >= minMargin)) belowMin++
  }
  return {
    averageMargin: builds.length > 0 ? sum / builds.length : null,
    weakest,
    belowWarn,
    belowMin,
  }
}
