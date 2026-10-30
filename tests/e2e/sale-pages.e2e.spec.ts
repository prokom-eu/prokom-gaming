import { createHmac, randomInt } from 'node:crypto'

import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Bon and „Gotowe od ręki” (spec. §11–§12, G13) at 1440 and 414, with FEATURE_READY and
 * FEATURE_VOUCHER on (CI sets them; locally the `dev-gotowe-bon` launch configuration): the
 * voucher order and the reservation end with a record and two e-mails, the reserved unit leaves
 * the list and cannot be reserved twice, the panel's margin guard blocks a too big discount.
 * Without the flags the tests are skipped (the pages answer 404). axe: `a11y.e2e.spec.ts`.
 */

const MAILPIT =
  process.env.MAILPIT_URL ?? `http://127.0.0.1:${Number(process.env.SMTP_PORT ?? 1026) + 7000}`
const run = Date.now().toString(36)

test.beforeEach(async ({ request }) => {
  const on = (await request.get('/bon')).status() === 200
  // CI turns the flags on: there a skip would hide the tests, so it fails instead.
  if (process.env.CI && !on) throw new Error('FEATURE_VOUCHER / FEATURE_READY are off in CI')
  test.skip(!on, 'FEATURE_VOUCHER / FEATURE_READY are off on this server')
})

/** A signed „form shown at” token, like the page renders (ADR-G005; same as inquiry-api). */
function formToken(): string {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is not set.')
  const issuedAt = Date.now() - 5_000
  const signature = createHmac('sha256', secret)
    .update(`inquiry-form:${issuedAt}`)
    .digest('base64url')
  return `${issuedAt}.${signature}`
}

async function adminHeaders(request: APIRequestContext) {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set.')
  const login = await request.post('/api/users/login', { data: { email, password } })
  return { Authorization: `JWT ${((await login.json()) as { token: string }).token}` }
}

type Unit = { id: number; build: { slug: string } }

/** Seeded units by build slug (seed: wampir, rusalka, bies). */
async function units(request: APIRequestContext): Promise<Record<string, number>> {
  const res = await request.get('/api/stock?depth=1&limit=50', {
    headers: await adminHeaders(request),
  })
  const { docs } = (await res.json()) as { docs: Unit[] }
  return Object.fromEntries(docs.map((d) => [d.build.slug, d.id]))
}

async function inquiryByNumber(request: APIRequestContext, number: string) {
  const res = await request.get(
    `/api/inquiries?where[number][equals]=${encodeURIComponent(number)}&depth=0`,
    { headers: await adminHeaders(request) },
  )
  const { docs } = (await res.json()) as { docs: Record<string, unknown>[] }
  expect(docs).toHaveLength(1)
  return docs[0]!
}

async function subjectsTo(request: APIRequestContext, address: string): Promise<string[]> {
  const res = await request.get(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`,
  )
  return ((await res.json()) as { messages: { Subject: string }[] }).messages.map((m) => m.Subject)
}

/** Fills the sheet and sends once the signed token is old enough (ADR-G005: ≥ 3 s). */
async function sendSheet(page: Page, email: string, openedAt: number): Promise<string> {
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Imię').fill('Test e2e')
  await sheet.getByLabel('E-mail').fill(email)
  await sheet.getByRole('checkbox', { name: /Zgadzam się na kontakt/ }).check()
  await page.waitForTimeout(Math.max(0, 3_500 - (Date.now() - openedAt)))
  await sheet.getByRole('button', { name: /^(Zamów bon|Zarezerwuj)$/ }).click()
  const status = sheet.getByRole('status')
  await expect(status).toContainText('Wysłane', { timeout: 30_000 })
  const number = (await status.locator('strong').textContent()) ?? ''
  expect(number).toMatch(/^PKG-\d{4}-\d{4,}$/)
  return number
}

const ownIp = (page: Page) =>
  page.setExtraHTTPHeaders({ 'x-real-ip': `198.51.100.${randomInt(1, 254)}` })

test('/bon: live preview, no instalments, order → voucher record and two e-mails', async ({
  page,
  request,
}, testInfo) => {
  await ownIp(page)
  await page.goto('/bon')
  const openedAt = Date.now()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Bon podarunkowy PRO-KOM Gaming' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(0)
  // Decision 25.10.2026: the board's question about instalments is not on the page.
  expect(await page.locator('main').innerText()).not.toMatch(
    /(^|[^\p{L}])rat(y|ami|ach)?([^\p{L}]|$)/iu,
  )
  expect(await page.locator('main').innerText()).not.toMatch(/\[[^\]\n]{2,}\]/)

  await page
    .getByRole('group', { name: 'Kwota' })
    .getByRole('button', { name: /2\s000 zł/ })
    .click()
  await page
    .getByRole('group', { name: 'Wygląd bonu' })
    .getByRole('button', { name: 'Wampir' })
    .click()
  await page.getByLabel('Dla kogo').fill('Dla Oli')
  await expect(page.locator('.bn-card')).toContainText('Dla Oli')
  await expect(page.locator('.bn-card')).toContainText(/2\s000 zł/i)

  await page.getByRole('button', { name: 'Zamów bon' }).click()
  const email = `bon-${run}-${testInfo.project.name}@example.test`
  const number = await sendSheet(page, email, openedAt)

  expect(await inquiryByNumber(request, number)).toMatchObject({
    type: 'voucher',
    voucher: { amount: 2000, design: 'wampir', recipient: 'Dla Oli' },
  })
  await expect
    .poll(() => subjectsTo(request, email), { timeout: 20_000 })
    .toContain(`Otrzymaliśmy Twoje zapytanie ${number} — PRO-KOM Gaming`)
})

test('/gotowe: reservation → ready record at the unit price, the unit leaves the list', async ({
  page,
  request,
}, testInfo) => {
  // Each project reserves its own unit; the seed frees them before every CI run.
  const slug = testInfo.project.name === 'mobile-414' ? 'rusalka' : 'wampir'
  const ids = await units(request)
  const id = ids[slug]!
  await request.patch(`/api/stock/${id}`, {
    headers: await adminHeaders(request),
    data: { reservedUntil: null },
  })

  await ownIp(page)
  await page.goto('/gotowe')
  const openedAt = Date.now()
  await expect(page.getByRole('heading', { level: 1, name: 'Gotowe od ręki' })).toBeVisible()
  const card = page.locator('.gt-unit', {
    has: page
      .getByRole('heading', { level: 2 })
      .filter({ hasText: new RegExp(slug === 'wampir' ? 'Wampir' : 'Rusałka', 'i') }),
  })
  await expect(card).toContainText('cena za ten egzemplarz')
  await card.getByRole('button', { name: 'Zarezerwuj' }).click()
  const email = `gotowe-${run}-${testInfo.project.name}@example.test`
  const number = await sendSheet(page, email, openedAt)

  const record = await inquiryByNumber(request, number)
  expect(record).toMatchObject({ type: 'ready', stock: id })
  expect(typeof record.priceAtInquiry).toBe('number')
  await expect
    .poll(() => subjectsTo(request, email), { timeout: 20_000 })
    .toContain(`Otrzymaliśmy Twoje zapytanie ${number} — PRO-KOM Gaming`)

  await page.reload()
  await expect(card).toHaveCount(0)
})

test('two reservations of one unit at the same moment: exactly one wins', async ({
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440', 'one run is enough (it reserves a unit)')
  const id = (await units(request)).bies!
  const headers = await adminHeaders(request)
  await request.patch(`/api/stock/${id}`, { headers, data: { reservedUntil: null } })
  const body = (n: number) => ({
    type: 'ready',
    stock: id,
    name: 'Test e2e',
    email: `race-${run}-${n}@example.test`,
    consent: { accepted: true, clauseVersion: '2026-10-27' },
    source: { url: 'http://localhost:3100/gotowe' },
    formToken: formToken(),
  })
  const [a, b] = await Promise.all(
    [1, 2].map((n) =>
      request.post('/api/inquiry', {
        data: body(n),
        headers: { 'x-real-ip': `198.51.100.${randomInt(1, 254)}` },
      }),
    ),
  )
  expect([a.status(), b.status()].sort()).toEqual([201, 400])
  const refused = a.status() === 400 ? a : b
  expect(await refused.json()).toEqual({ error: 'invalid', fields: ['stock'] })
  // Free it again for the next test and runs.
  await request.patch(`/api/stock/${id}`, { headers, data: { reservedUntil: null } })
})

test('/api/stock is panel-only (units are read by the page itself)', async ({ request }) => {
  expect((await request.get('/api/stock')).status()).toBe(403)
})

test('panel: the margin guard blocks a discount below the minimum margin', async ({
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440', 'one run is enough (it edits a unit)')
  const id = (await units(request)).bies!
  const headers = await adminHeaders(request)
  const blocked = await request.patch(`/api/stock/${id}`, { headers, data: { discount: 3000 } })
  expect(blocked.status()).toBe(400)
  expect(JSON.stringify(await blocked.json())).toContain('Za duży rabat')
  const fine = await request.patch(`/api/stock/${id}`, { headers, data: { discount: 0 } })
  expect(fine.status()).toBe(200)
  // Taking a unit off the site always works, whatever its margin.
  const off = await request.patch(`/api/stock/${id}`, { headers, data: { active: false } })
  expect(off.status()).toBe(200)
  await request.patch(`/api/stock/${id}`, { headers, data: { active: true } })
})
