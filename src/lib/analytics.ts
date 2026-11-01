/**
 * Site statistics: Umami on our own server, no cookies (ADR-G009). The script loads only on
 * production and staging (`analyticsScript`); `track()` is safe anywhere — without the script
 * (local run, blocked by an extension, still loading) it does nothing and never throws.
 * No personal data in events: no names, e-mails or inquiry numbers.
 */

/** Events of ADR-G009 pt 3 with their data. `undefined` = an event without data. */
export type AnalyticsEvents = {
  configurator_start: undefined
  configurator_step: { step: string }
  configurator_done: undefined
  /** The inquiry type of `/api/inquiry` (build, config, compare, advice, contact, voucher…). */
  inquiry_sent: { type: string }
  game_pick: { game: string }
  compare_open: undefined
  build_ask: { build: string }
}
export type AnalyticsEvent = keyof AnalyticsEvents

type Umami = { track: (name: string, data?: Record<string, string>) => unknown }

export function track<E extends AnalyticsEvent>(
  name: E,
  ...data: AnalyticsEvents[E] extends undefined ? [] : [AnalyticsEvents[E]]
): void {
  try {
    const umami = (globalThis as { umami?: Umami }).umami
    if (typeof umami?.track === 'function') umami.track(name, data[0])
  } catch {
    // Statistics never break the page.
  }
}

export type AnalyticsScript = { src: string; websiteId: string }

/**
 * The Umami script for this deployment, or `null`: only on production and staging (ADR-G009
 * pt 2), and only with both the script address and the website id set (`.env.example`).
 */
export function analyticsScript(env: {
  SITE_ENV: string
  UMAMI_SCRIPT_URL?: string
  UMAMI_WEBSITE_ID?: string
}): AnalyticsScript | null {
  if (env.SITE_ENV !== 'production' && env.SITE_ENV !== 'staging') return null
  if (!env.UMAMI_SCRIPT_URL || !env.UMAMI_WEBSITE_ID) return null
  return { src: env.UMAMI_SCRIPT_URL, websiteId: env.UMAMI_WEBSITE_ID }
}
