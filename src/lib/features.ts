/**
 * Pages waiting for the boss's decision (spec. §11 Gotowe od ręki, §12 bon): off unless the
 * variable is `1`. Read straight from `process.env`, not through `getEnv()`: the layout also
 * renders at build time, where the server variables are absent. Off = the page answers 404 and
 * the shell does not link to it.
 */
export type Features = { ready: boolean; voucher: boolean }

export function features(source: Record<string, string | undefined> = process.env): Features {
  return { ready: source.FEATURE_READY === '1', voucher: source.FEATURE_VOUCHER === '1' }
}
