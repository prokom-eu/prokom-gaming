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

/**
 * Umami's `data-before-send` hook (tracker 3.4.1: called with `(type, payload)` before every
 * send; a falsy return cancels it). No secret from an address ever leaves the browser:
 * - nothing from the account pages (`/konto…`: login, reset and verification tokens);
 * - no query or hash in `url` or `referrer` (`?token=`, `?nr=PKG-…`; `data-exclude-search`
 *   covers only `url`, and a same-site referrer is sent as a path with its query);
 * - the certificate code in `/metryka/<kod>` is a key to that page: sent as `/metryka/*`.
 * `url` comes as a full address (`https://prokomgaming.pl/…`), a same-site `referrer` as a path:
 * both forms are handled. Self-contained on purpose: the layout inlines it with `toString()`
 * (no imports, no closure).
 */
export function umamiBeforeSend(
  _type: string,
  payload: { url?: string; referrer?: string } & Record<string, unknown>,
): typeof payload | false {
  // Origin (optional), then the path.
  const parts = /^((?:[a-z][a-z0-9+.-]*:)?\/\/[^/?#]*)?([^?#]*)/i
  const clean = (address: string | undefined) => {
    if (typeof address !== 'string') return address
    const match = parts.exec(address)
    const origin = match?.[1] ?? ''
    const path = (match?.[2] ?? '').replace(/^\/metryka\/[^/]+/, '/metryka/*')
    return origin + path
  }
  const url = clean(payload.url)
  const path = typeof url === 'string' ? (parts.exec(url)?.[2] ?? '') : ''
  if (/^\/konto(\/|$)/.test(path)) return false
  return { ...payload, url, referrer: clean(payload.referrer) }
}

/** Name of the hook on `window`, read by the tracker from `data-before-send`. */
export const UMAMI_BEFORE_SEND = 'pkgUmamiBeforeSend'

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
