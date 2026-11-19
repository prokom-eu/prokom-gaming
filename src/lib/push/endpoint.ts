/**
 * Hosts of the browsers' push services (Web Push). The server POSTs to a subscription's endpoint,
 * so only these hosts are accepted — an endpoint is otherwise any https URL a panel user sends
 * (audit AB4, G-07: a request from our server to an address of someone's choosing).
 */
const PUSH_HOSTS = [
  'fcm.googleapis.com', // Chrome, Edge (Chromium), Opera, Samsung
  'updates.push.services.mozilla.com', // Firefox
  'web.push.apple.com', // Safari (macOS, iOS)
]
const PUSH_HOST_SUFFIXES = ['.notify.windows.com', '.push.apple.com'] // Edge legacy (WNS), Apple

/**
 * `local` (dev, CI): also the reserved `.test` domain, so e2e can subscribe a fake endpoint
 * (`push.example.test`) without reaching a real push service.
 */
export function isPushServiceEndpoint(
  endpoint: string,
  siteEnv: string | undefined = process.env.SITE_ENV,
): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false
  const host = url.hostname.toLowerCase()
  if ((siteEnv ?? 'local') === 'local' && host.endsWith('.test')) return true
  return PUSH_HOSTS.includes(host) || PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
}
