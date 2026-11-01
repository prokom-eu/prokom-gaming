import { randomBytes } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

import { ADMIN_STATE, adminHeaders } from './helpers/adminSession'

/**
 * /admin/zamowienia (P5, panel spec §7, board Zamowienia, stany/tel-07): the board shows the
 * orders by stage; ticking the checklist is saved; „Przesuń do” appends `stageHistory` and — for a
 * stage the customer hears about — sends the stage e-mail; `serwis` lands here after login and sees
 * no amounts. Creates its own orders (unique e-mails) and removes them at the end.
 */

test.describe.configure({ mode: 'serial' })
test.use({ storageState: ADMIN_STATE })

const MAILPIT =
  process.env.MAILPIT_URL ?? `http://127.0.0.1:${Number(process.env.SMTP_PORT ?? 1026) + 7000}`
const run = randomBytes(4).toString('hex')

type Order = {
  id: number
  number: string
  stage: string
  stageHistory: { stage: string }[]
  checklist: { key: string; done: boolean }[]
}

let api: APIRequestContext
let headers: Record<string, string>
const created: number[] = []

async function buildId(slug: string): Promise<number> {
  const res = await api.get(`/api/builds?where[slug][equals]=${slug}&depth=0`, { headers })
  return ((await res.json()) as { docs: { id: number }[] }).docs[0]!.id
}

async function newOrder(stage: string, tag: string): Promise<Order & { email: string }> {
  const email = `p5-${tag}-${run}@example.test`
  const res = await api.post('/api/orders?depth=0', {
    headers,
    data: {
      name: `Bartek ${tag}`,
      email,
      stage,
      build: await buildId('skrzat'),
      price: 4990,
      dueDate: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    },
  })
  expect(res.status(), await res.text()).toBe(201)
  const doc = ((await res.json()) as { doc: Order }).doc
  created.push(doc.id)
  return { ...doc, email }
}

async function order(id: number): Promise<Order> {
  const res = await api.get(`/api/orders/${id}?depth=0`, { headers })
  return (await res.json()) as Order
}

async function stageMail(address: string, number: string) {
  let subject = ''
  await expect
    .poll(
      async () => {
        const res = await api.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`,
        )
        const list = (await res.json()) as { messages: { Subject: string }[] }
        subject = list.messages.find((m) => m.Subject.startsWith(`[${number}]`))?.Subject ?? ''
        return subject
      },
      { timeout: 15_000 },
    )
    .not.toBe('')
  return subject
}

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

test.beforeAll(async ({ playwright, baseURL }) => {
  api = await playwright.request.newContext({ baseURL })
  headers = adminHeaders()
})

test.afterAll(async () => {
  for (const id of created) await api.delete(`/api/orders/${id}`, { headers })
  await api.dispose()
})

test('board: checklist is saved, moving a stage records it and e-mails the customer', async ({
  page,
}, info) => {
  const o = await newOrder('paid', info.project.name)
  await page.goto(`/admin/zamowienia?z=${o.id}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Zamówienia i warsztat' })).toBeVisible()
  const panel = page.getByRole('region', { name: `Zamówienie ${o.number}` })
  await expect(panel).toBeVisible()
  await expect(panel).toContainText('„Skrzat: Opłacone”')

  // Checklist: saved on the server, still ticked after a reload.
  await panel.getByRole('checkbox', { name: 'BIOS i sterowniki zaktualizowane' }).check()
  await expect
    .poll(async () => (await order(o.id)).checklist.find((c) => c.key === 'bios')?.done)
    .toBe(true)

  await page.screenshot({
    path: `test-results/p5/zamowienia-${info.project.name}.png`,
    fullPage: true,
  })
  await noSidewaysScroll(page)
  const axe = await new AxeBuilder({ page }).analyze()
  expect(axe.violations.map((v) => v.id)).toEqual([])

  // paid → parts: a workshop step, no e-mail.
  await panel.getByRole('button', { name: 'Przesuń do: Części' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Przesunięte.' })).toBeVisible()
  // parts → assembly: the customer gets the stage e-mail.
  const again = page.getByRole('region', { name: `Zamówienie ${o.number}` })
  await again.getByRole('button', { name: 'Przesuń do: Montaż' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Klient dostał e-mail z nowym etapem.' }),
  ).toBeVisible({ timeout: 20_000 })

  const after = await order(o.id)
  expect(after.stage).toBe('assembly')
  expect(after.stageHistory.map((h) => h.stage)).toEqual(['paid', 'parts', 'assembly'])
  expect(await stageMail(o.email, o.number)).toBe(`[${o.number}] Twój komputer: Montaż`)
})

test('a stage seen as stale is not moved twice', async ({ page }, info) => {
  test.skip(info.project.name !== 'db-writers', 'one project is enough')
  const o = await newOrder('test', 'stale')
  await page.goto(`/admin/zamowienia?z=${o.id}`)
  // Someone moved it meanwhile (another device).
  await api.patch(`/api/orders/${o.id}`, { headers, data: { stage: 'metric_ready' } })
  await page
    .getByRole('region', { name: `Zamówienie ${o.number}` })
    .getByRole('button', { name: 'Przesuń do: Metryka' })
    .click()
  await expect(page.getByRole('status').filter({ hasText: 'odśwież tablicę' })).toBeVisible()
  expect((await order(o.id)).stage).toBe('metric_ready')
})

test.describe('signed in with the serwis role', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  test.skip(({ isMobile }) => isMobile, 'one project is enough for the role check')

  const email = `p5-serwis-${run}@example.test`
  const password = randomBytes(12).toString('hex')
  let userId: number

  test.beforeAll(async () => {
    const res = await api.post('/api/users', { headers, data: { email, password, role: 'serwis' } })
    expect(res.status(), await res.text()).toBe(201)
    userId = ((await res.json()) as { doc: { id: number } }).doc.id
  })

  test.afterAll(async () => {
    if (userId) await api.delete(`/api/users/${userId}`, { headers })
  })

  test('starts on the board, sees no amounts and no client card', async ({ page }) => {
    const o = await newOrder('paid', 'serwis')
    await page.goto('/admin/login')
    await page.locator('#field-email').fill(email)
    await page.locator('#field-password').fill(password)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/admin\/zamowienia$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Zamówienia i warsztat' }),
    ).toBeVisible()
    await page.goto(`/admin/zamowienia?z=${o.id}`)
    const panel = page.getByRole('region', { name: `Zamówienie ${o.number}` })
    await expect(panel.getByRole('button', { name: 'Przesuń do: Części' })).toBeVisible()
    await expect(panel.getByRole('link', { name: 'Klient' })).toHaveCount(0)
    // What the person sees, and no order amount in the HTML or RSC data. (Payload's own field
    // descriptions — „strażnik marży” — are in every panel page's config, not data.)
    expect(await page.locator('body').innerText()).not.toMatch(/zł|Marża|marż|Wartość w realizacji/)
    expect(await page.content()).not.toMatch(/4\s?990|price\W{0,4}:\s?\d/)

    await page.goto('/admin/klienci')
    await expect(page.getByRole('heading', { level: 1, name: 'Brak dostępu (403)' })).toBeVisible()
  })
})
