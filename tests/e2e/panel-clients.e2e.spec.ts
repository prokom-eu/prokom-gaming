import { createHmac, randomBytes, randomInt } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

import { CONSENT_CLAUSE } from '../../src/lib/inquiry/consent'
import { ADMIN_STATE, adminHeaders } from './helpers/adminSession'

/**
 * /admin/klienci and /admin/klient (P5, panel spec §6, board Klient, stany/tel-09): records with
 * one e-mail make one client; the card gathers them; „Eksport danych” gives JSON with every
 * collection of spec §6; „Usuń dane na żądanie” deletes inquiries (trail in `inquiry-deletions`)
 * and anonymises the order and the unit (decision Krystian 01.11.2026).
 */

test.describe.configure({ mode: 'serial' })
test.use({ storageState: ADMIN_STATE })

const run = randomBytes(4).toString('hex')

function formToken(): string {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is not set.')
  const issuedAt = Date.now() - 5_000
  const signature = createHmac('sha256', secret)
    .update(`inquiry-form:${issuedAt}`)
    .digest('base64url')
  return `${issuedAt}.${signature}`
}

let api: APIRequestContext
let headers: Record<string, string>
const orders: number[] = []
const units: number[] = []

type Client = { email: string; name: string; number: string; orderId: number; unitId: number }

async function newClient(tag: string): Promise<Client> {
  const email = `p5-klient-${tag}-${run}@example.test`
  const name = `Klient ${tag} ${run}`
  const res = await api.post('/api/inquiry', {
    headers: { 'x-real-ip': `10.${randomInt(0, 256)}.${randomInt(0, 256)}.${randomInt(1, 255)}` },
    data: {
      type: 'build',
      build: 'skrzat',
      name,
      email,
      phone: '+48 512 345 691',
      preferredContact: 'phone',
      message: 'Biorę Skrzata, odbiór w Rabce.',
      consent: { accepted: true, clauseVersion: CONSENT_CLAUSE.version },
      source: { url: 'http://localhost:3100/zestawy/skrzat' },
      formToken: formToken(),
    },
  })
  expect(res.status(), await res.text()).toBe(201)
  const { number } = (await res.json()) as { number: string }
  const builds = await api.get('/api/builds?where[slug][equals]=skrzat&depth=0', { headers })
  const build = ((await builds.json()) as { docs: { id: number }[] }).docs[0]!.id
  const unit = await api.post('/api/units?depth=0', {
    headers,
    data: {
      build,
      email: email.toUpperCase(), // normalised on save — still the same client
      warrantyUntil: '2028-11-04T00:00:00.000Z',
    },
  })
  expect(unit.status(), await unit.text()).toBe(201)
  const unitId = ((await unit.json()) as { doc: { id: number } }).doc.id
  units.push(unitId)
  const order = await api.post('/api/orders?depth=0', {
    headers,
    data: { name, email, stage: 'test', build, price: 4990, unit: unitId },
  })
  expect(order.status(), await order.text()).toBe(201)
  const orderId = ((await order.json()) as { doc: { id: number } }).doc.id
  orders.push(orderId)
  return { email, name, number, orderId, unitId }
}

test.beforeAll(async ({ playwright, baseURL }) => {
  api = await playwright.request.newContext({ baseURL })
  headers = adminHeaders()
})

test.afterAll(async () => {
  for (const id of orders) await api.delete(`/api/orders/${id}`, { headers })
  for (const id of units) await api.delete(`/api/units/${id}`, { headers })
  await api.dispose()
})

test('list → card: one client from the inquiry, the order and the unit', async ({ page }, info) => {
  const c = await newClient(info.project.name)
  await page.goto('/admin/klienci')
  await page.getByRole('link', { name: c.name }).click()
  await expect(page).toHaveURL(/\/admin\/klient\?(konto|zapytanie|zamowienie)=\d+$/)
  await expect(page.getByRole('heading', { level: 1, name: c.name })).toBeVisible()
  // Never an address in the URL (spec §1).
  expect(page.url()).not.toContain('@')
  await expect(page.getByText('klient · 1 komputer')).toBeVisible()
  await expect(page.getByText('Testy', { exact: true })).toBeVisible()
  await expect(page.getByText('do 11.2028')).toBeVisible()
  await expect(page.getByText(`Zapytanie ${c.number}:`)).toBeVisible()

  await page.getByRole('tab', { name: 'Zgody i RODO' }).click()
  await expect(page.getByRole('button', { name: 'Eksport danych klienta (RODO)' })).toBeVisible()

  await page.screenshot({ path: `test-results/p5/klient-${info.project.name}.png`, fullPage: true })
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
  const axe = await new AxeBuilder({ page }).analyze()
  expect(axe.violations.map((v) => v.id)).toEqual([])
})

test('export has every collection; erasure deletes and anonymises, with a trail', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'db-writers', 'one project is enough for the data path')
  const c = await newClient('rodo')
  // Mail from the client in „Nieprzypisane”, and from someone whose address only contains theirs.
  const unmatched = async (from: string) => {
    const res = await api.post('/api/mail-intake-unmatched?depth=0', {
      headers,
      data: {
        from,
        subject: `P5 ${run}`,
        receivedAt: new Date().toISOString(),
        body: 'treść',
        status: 'new',
      },
    })
    expect(res.status(), await res.text()).toBe(201)
    return ((await res.json()) as { doc: { id: number } }).doc.id
  }
  const own = await unmatched(c.email)
  const other = await unmatched(`k${c.email}`)
  await page.goto(`/admin/klient?zamowienie=${c.orderId}`)
  await page.getByRole('tab', { name: 'Zgody i RODO' }).click()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Eksport danych klienta (RODO)' }).click()
  const file = await download
  expect(file.suggestedFilename()).not.toContain('@')
  const data = JSON.parse(await readFile((await file.path())!, 'utf8')) as Record<string, unknown[]>
  for (const key of [
    'inquiries',
    'inquiryMessages',
    'orders',
    'units',
    'tickets',
    'customers',
    'pushSubscriptions',
  ]) {
    expect(Array.isArray(data[key]), key).toBe(true)
  }
  expect(data.inquiries).toHaveLength(1)
  expect(data.orders).toHaveLength(1)
  expect(data.units).toHaveLength(1)
  expect((data.unmatchedMail as { id: number }[]).map((m) => m.id)).toEqual([own])

  await page.getByRole('button', { name: 'Usuń dane na żądanie…' }).click()
  const sheet = page.getByRole('dialog', { name: 'Usuń dane klienta' })
  const erase = sheet.getByRole('button', { name: 'Usuń dane', exact: true })
  await expect(erase).toBeDisabled()
  await sheet.getByRole('checkbox', { name: 'Klient poprosił o usunięcie danych' }).check()
  await erase.click()
  await expect(page).toHaveURL(/\/admin\/klienci$/)

  const left = await api.get(
    `/api/inquiries?where[email][equals]=${encodeURIComponent(c.email)}&depth=0`,
    { headers },
  )
  expect(((await left.json()) as { totalDocs: number }).totalDocs).toBe(0)
  const trail = await api.get(
    `/api/inquiry-deletions?where[number][equals]=${encodeURIComponent(c.number)}&depth=0`,
    { headers },
  )
  const trailDocs = ((await trail.json()) as { docs: { reason: string }[] }).docs
  expect(trailDocs.map((d) => d.reason)).toEqual(['request'])

  const order = (await (await api.get(`/api/orders/${c.orderId}?depth=0`, { headers })).json()) as {
    name: string
    email: string
    price: number
    inquiry: unknown
  }
  expect(order).toMatchObject({ name: 'Dane usunięte', price: 4990, inquiry: null })
  expect(order.email).toMatch(/@usuniete\.invalid$/)
  const unit = (await (await api.get(`/api/units/${c.unitId}?depth=0`, { headers })).json()) as {
    email: string
    code: string
  }
  expect(unit.email).toMatch(/@usuniete\.invalid$/)
  expect(unit.code).toBeTruthy()

  // The client's own mail is gone, the other person's stays.
  expect((await api.get(`/api/mail-intake-unmatched/${own}`, { headers })).status()).toBe(404)
  expect((await api.get(`/api/mail-intake-unmatched/${other}`, { headers })).status()).toBe(200)
  await api.delete(`/api/mail-intake-unmatched/${other}`, { headers })

  // The anonymised order is not a client any more.
  await expect(page.getByRole('link', { name: 'Dane usunięte' })).toHaveCount(0)
})
