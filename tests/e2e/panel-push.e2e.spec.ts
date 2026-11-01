import { createECDH, randomBytes, randomInt } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { ADMIN_STATE, adminHeaders } from './helpers/adminSession'

/**
 * Settings → Powiadomienia na telefon (P4, ADR-G010 pt 8). Chromium in Playwright has no push
 * service, so `pushManager` is faked in the page; the service worker itself is real (registered
 * from /admin/sw.js with scope /admin). „Wyślij próbne” goes through `notify-send` and web-push to
 * the fake endpoint, which cannot answer — the panel says so. A real push: by hand on Android and
 * iPhone (STAN). CI generates throwaway VAPID keys per run; without them only the „off” note shows.
 */

test.describe.configure({ mode: 'serial' })
test.use({ storageState: ADMIN_STATE })

const run = `${Date.now().toString(36)}${randomInt(0, 1000)}`
const endpoint = `https://push.example.test/e2e-${run}`
const vapid = Boolean(process.env.VAPID_PUBLIC_KEY)
// A real P-256 key pair and auth secret per run (like a browser makes), so web-push gets as far
// as the network — and no key-looking value lives in the repo.
const ecdh = createECDH('prime256v1')
ecdh.generateKeys()
const keys = {
  p256dh: ecdh.getPublicKey().toString('base64url'),
  auth: randomBytes(16).toString('base64url'),
}

test('the service worker only shows pushes and may take the /admin scope', async ({ request }) => {
  const res = await request.get('/admin/sw.js')
  expect(res.status()).toBe(200)
  expect(res.headers()['service-worker-allowed']).toBe('/admin')
  expect(res.headers()['content-type']).toContain('javascript')
  const body = await res.text()
  expect(body).toContain("addEventListener('push'")
  // No cache and no offline: nothing of the panel stays on the phone.
  expect(body).not.toContain("addEventListener('fetch'")
  expect(body).not.toContain('caches')
})

test('anonymous visitors read no devices', async ({ playwright, baseURL }) => {
  // An empty state: request contexts inherit the admin session of `test.use()` otherwise.
  const anon = await playwright.request.newContext({
    baseURL,
    storageState: { cookies: [], origins: [] },
  })
  const res = await anon.get('/api/push-subscriptions')
  expect(res.status()).toBe(403)
  await anon.dispose()
})

test('without VAPID keys the section says push is off', async ({ page }) => {
  test.skip(vapid, 'VAPID keys set — the next test covers the section')
  await page.goto('/admin/ustawienia')
  await expect(page.getByText('Powiadomienia push są wyłączone')).toBeVisible()
})

test('switch on, choose kinds, send a test, remove — with a faked pushManager', async ({
  page,
  context,
  playwright,
  baseURL,
  isMobile,
}) => {
  test.skip(!vapid, 'no VAPID keys in this environment')
  await context.grantPermissions(['notifications'])
  await page.addInitScript(
    ({ fakeEndpoint, fakeKeys }) => {
      let subscription: PushSubscription | null = null
      const make = () =>
        ({
          endpoint: fakeEndpoint,
          expirationTime: null,
          options: {},
          toJSON: () => ({
            endpoint: fakeEndpoint,
            keys: fakeKeys,
          }),
          unsubscribe: async () => {
            subscription = null
            return true
          },
        }) as unknown as PushSubscription
      PushManager.prototype.getSubscription = async () => subscription
      PushManager.prototype.subscribe = async () => {
        subscription = make()
        return subscription
      }
    },
    { fakeEndpoint: endpoint, fakeKeys: keys },
  )

  await page.goto('/admin/ustawienia')
  const section = page.locator('.pn-push[data-ready]')
  await expect(section).toBeVisible()
  await section.getByRole('button', { name: 'Włącz na tym urządzeniu' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Powiadomienia włączone' })).toBeVisible({
    timeout: 20_000,
  })
  const device = section.getByRole('listitem').filter({ hasText: 'to urządzenie' })
  await expect(device).toHaveCount(1)
  // The real service worker took the scope /admin.
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistration('/admin'))?.scope,
    ),
  ).toMatch(/\/admin$/)

  if (!isMobile) {
    const axe = await new AxeBuilder({ page })
      .include('[data-panel]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(
      axe.violations.map((v) => ({ rule: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([])
  } else {
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scroll).toBeLessThanOrEqual(414)
  }

  // Kinds: switch the margin alarm off; the API shows the kinds but never the endpoint or keys.
  await device.getByRole('switch', { name: 'Marża poniżej minimum' }).uncheck()
  await expect(page.getByRole('status').filter({ hasText: 'Zapisano.' })).toBeVisible()
  const api = await playwright.request.newContext({ baseURL })
  const res = await api.get('/api/push-subscriptions?depth=0&sort=-createdAt&limit=1', {
    headers: adminHeaders(),
  })
  const text = await res.text()
  expect(text).not.toContain('push.example.test')
  expect(text).not.toContain(keys.auth)
  const mine = (JSON.parse(text) as { docs: { kinds: string[] }[] }).docs
  // P7 added `price_report` (on by default for a new device).
  expect(mine[0]?.kinds).toEqual(['inquiry_new', 'inquiry_reply', 'inquiry_sla', 'price_report'])
  await api.dispose()

  // The test send reaches web-push; the fake endpoint cannot answer, so the panel says so.
  await device.getByRole('button', { name: 'Wyślij próbne' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: /Nie udało się wysłać|usunięto je z listy/ }),
  ).toBeVisible({ timeout: 30_000 })

  // Remove (also unsubscribes this browser).
  await device.getByRole('button', { name: /^Usuń / }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Usunięto urządzenie.' })).toBeVisible()
  await expect(section.getByRole('listitem').filter({ hasText: 'to urządzenie' })).toHaveCount(0)
  await expect(section.getByRole('button', { name: 'Włącz na tym urządzeniu' })).toBeEnabled()
})
