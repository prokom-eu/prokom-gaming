import { randomBytes } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

/**
 * Customer account (G14, spec. §15): sign-up → verification e-mail (Mailpit) → link → sign-in →
 * the account shows the order with the same e-mail (any casing), its certificate and warranty →
 * a problem report → saved configuration → password reset → sign-out. At 1440 and 414.
 * The order and unit are created by the panel admin and removed at the end.
 */

// Mailpit's web API: CI maps SMTP 1025 → UI 8025, local compose 1026 → 8026 (CLAUDE.md).
const MAILPIT =
  process.env.MAILPIT_URL ?? `http://127.0.0.1:${Number(process.env.SMTP_PORT ?? 1026) + 7000}`
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

type Doc = Record<string, unknown> & { id: number }

let admin: APIRequestContext
let adminHeaders: Record<string, string>
const created: { collection: string; id: number }[] = []

async function create(collection: string, data: Record<string, unknown>): Promise<Doc> {
  const response = await admin.post(`/api/${collection}?depth=0`, { headers: adminHeaders, data })
  expect(response.status(), await response.text()).toBe(201)
  const doc = ((await response.json()) as { doc: Doc }).doc
  created.push({ collection, id: doc.id })
  return doc
}

/** The newest e-mail to `address` with `subject`, waited for (sending runs after the response). */
async function mailLink(
  request: APIRequestContext,
  address: string,
  subject: string,
  path: string,
) {
  let link: string | undefined
  await expect
    .poll(
      async () => {
        const search = await request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address} subject:"${subject}"`)}`,
        )
        const { messages } = (await search.json()) as { messages: { ID: string }[] }
        if (!messages[0]) return false
        const message = await request.get(`${MAILPIT}/api/v1/message/${messages[0].ID}`)
        const { HTML } = (await message.json()) as { HTML: string }
        link = new RegExp(`https?://[^"<\\s]+${path}\\?token=[a-f0-9]+`).exec(HTML)?.[0]
        return Boolean(link)
      },
      { timeout: 20_000 },
    )
    .toBe(true)
  return new URL(link!).pathname + new URL(link!).search
}

test.beforeAll(async ({ playwright, baseURL }) => {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set.')
  admin = await playwright.request.newContext({ baseURL })
  const login = await admin.post('/api/users/login', { data: { email, password } })
  expect(login.status()).toBe(200)
  adminHeaders = { Authorization: `JWT ${((await login.json()) as { token: string }).token}` }
})

test.afterAll(async () => {
  for (const { collection, id } of [...created].reverse()) {
    await admin.delete(`/api/${collection}/${id}`, { headers: adminHeaders })
  }
  await admin.dispose()
})

test('sign up, verify, see the order, report a problem, reset the password', async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(120_000)
  const email = `g14-konto-${testInfo.project.name}-${randomBytes(3).toString('hex')}@example.test`
  const password = randomBytes(9).toString('hex')

  // The panel has the order of this e-mail already (as after an accepted offer).
  const builds = (await (
    await admin.get('/api/builds?where[slug][equals]=wampir&depth=0')
  ).json()) as {
    docs: Doc[]
  }
  const build = builds.docs[0]!.id
  const unit = await create('units', {
    build,
    email: email.toUpperCase(),
    published: true,
    warrantyUntil: '2028-11-20',
    stressTest: { minutes: 60, errors: 0 },
    parts: [
      {
        role: 'gpu',
        label: 'Karta graficzna RTX 5070 Ti 16 GB',
        warrantyUntil: '2029-11-20',
        serial: 'SN-E2E',
      },
    ],
  })
  await create('orders', {
    build,
    stage: 'test',
    name: 'Ola',
    email,
    unit: unit.id,
    dueDate: '2026-11-25',
  })

  // An anonymous visitor is sent to the sign-in page.
  await page.goto('/konto')
  await expect(page).toHaveURL(/\/konto\/logowanie$/)

  // Sign-up (the form token needs 3 s — like a person filling it in).
  await page.goto('/konto/rejestracja')
  await page.getByLabel('Imię').fill('Ola')
  await page.getByLabel(/^E-mail/).fill(email)
  await page.getByLabel(/^Hasło/).fill(password)
  await page.getByRole('checkbox').check()
  await page.waitForTimeout(3_200)
  await page.getByRole('button', { name: 'Załóż konto' }).click()
  await expect(page.getByRole('status')).toContainText('Sprawdź skrzynkę')

  // Before verification the account cannot sign in.
  const early = await request.post('/api/customers/login', { data: { email, password } })
  expect(early.status()).not.toBe(200)

  await page.goto(await mailLink(request, email, 'Potwierdź adres', '/konto/weryfikacja'))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Adres potwierdzony')

  // Sign-in → the account.
  await page.goto('/konto/logowanie')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Hasło').fill(password)
  await page.getByRole('button', { name: 'Zaloguj się' }).click()
  await expect(page).toHaveURL(/\/konto$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cześć, Ola')
  await expect(page.locator('.kt-pc .nm')).toHaveText('Wampir')
  await expect(page.locator('.kt-pc .tl li[aria-current="step"]')).toHaveText('Test i pomiary')
  await expect(page.getByText('test obciążeniowy i pomiary w grach.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Zobacz metrykę' })).toHaveAttribute(
    'href',
    `/metryka/${String(unit.code)}`,
  )
  await expect(page.getByText('24 miesiące, do 20.11.2028')).toBeVisible()

  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  expect(violations.map((v) => ({ rule: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([])

  // A problem report lands in the panel with the session's e-mail and unit.
  await page.getByRole('button', { name: 'Nie włącza się' }).click()
  await page.getByLabel('Co się dzieje?').fill('Po aktualizacji nie startuje.')
  await page.getByRole('button', { name: 'Wyślij zgłoszenie' }).click()
  await expect(page.getByText('Zgłoszenie przyjęte')).toBeVisible()
  const tickets = (await (
    await admin.get(`/api/tickets?where[email][equals]=${encodeURIComponent(email)}&depth=0`, {
      headers: adminHeaders,
    })
  ).json()) as { docs: Doc[] }
  expect(tickets.docs).toHaveLength(1)
  expect(tickets.docs[0]).toMatchObject({ category: 'no_power', unit: unit.id, status: 'new' })
  created.push({ collection: 'tickets', id: tickets.docs[0]!.id })
  await expect(page.locator('.kt-history')).toContainText('Nie włącza się')

  // Saving a configuration, then it opens in the configurator.
  const save = await page.request.post('/api/konto/konfiguracje', {
    data: { label: 'Moc 4, biała', k: 'P13.LB500.PL3LX.R32.NM1', light: 'lod' },
  })
  expect(save.status()).toBe(201)
  await page.reload()
  await expect(page.locator('.kt-saved__item a')).toHaveAttribute(
    'href',
    '/konfigurator?k=P13.LB500.PL3LX.R32.NM1&swiatlo=lod',
  )

  // Sign-out, then a new password from the e-mail link signs in again.
  await page.getByRole('button', { name: 'Wyloguj' }).click()
  // The home page may compile first under `next dev`.
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 })
  expect((await page.request.get('/api/customers/me')).ok()).toBe(true)
  const me = (await (await page.request.get('/api/customers/me')).json()) as { user: unknown }
  expect(me.user).toBeNull()
  await page.goto('/konto/haslo')
  await page.getByLabel('E-mail konta').fill(email)
  await page.getByRole('button', { name: 'Wyślij link' }).click()
  await expect(page.getByRole('status')).toContainText('Jeśli ten adres ma u nas konto')
  await page.goto(await mailLink(request, email, 'Nowe hasło', '/konto/haslo'))
  await page.getByLabel(/^Nowe hasło/).fill(`${password}-nowe`)
  await page.getByRole('button', { name: 'Ustaw hasło' }).click()
  await expect(page).toHaveURL(/\/konto$/)

  // The account itself goes at the end (after its ticket).
  const account = (await (
    await admin.get(`/api/customers?where[email][equals]=${encodeURIComponent(email)}&depth=0`, {
      headers: adminHeaders,
    })
  ).json()) as { docs: Doc[] }
  created.unshift({ collection: 'customers', id: account.docs[0]!.id })
})

test('sign-up without the signed form token is refused as spam', async ({ request }) => {
  const response = await request.post('/api/konto/rejestracja', {
    data: { name: 'X', email: 'x@example.test', password: 'x' },
  })
  // No form token: refused as spam before anything else is looked at.
  expect(response.status()).toBe(400)
})
