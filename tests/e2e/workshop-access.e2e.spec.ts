import { randomBytes } from 'node:crypto'

import { expect, test } from '@playwright/test'
import type { APIRequestContext, PlaywrightWorkerArgs } from '@playwright/test'

type Playwright = PlaywrightWorkerArgs['playwright']

/**
 * Access rules of G14 (ADR-G005, panel spec §15):
 * - nothing about orders, units, tickets or accounts is public; the workshop strip has no personal data,
 * - a `serwis` panel account runs the workshop but sees no inquiries, costs or settings,
 * - a customer sees only their own records, and only after verifying the e-mail,
 * - nobody can open a "verified" customer account through the REST API.
 * Every record here is created by the test (unique e-mails) and removed at the end.
 */

// The API does not depend on the viewport: one project is enough.
test.skip(({ isMobile }) => isMobile, 'API test runs in the desktop project only')
test.describe.configure({ mode: 'serial' })

type Doc = Record<string, unknown> & { id: number }
type List = { docs: Doc[]; totalDocs: number }

const run = randomBytes(4).toString('hex')
const password = () => randomBytes(12).toString('hex')
const mail = (who: string) => `g14-${who}-${run}@example.test`

let admin: APIRequestContext
let adminHeaders: Record<string, string>
const created: { collection: string; id: number }[] = []

async function login(
  playwright: Playwright,
  baseURL: string | undefined,
  collection: 'users' | 'customers',
  email: string,
  pass: string,
) {
  const context = await playwright.request.newContext({ baseURL })
  const response = await context.post(`/api/${collection}/login`, {
    data: { email, password: pass },
  })
  return { context, response }
}

async function create(collection: string, data: Record<string, unknown>): Promise<Doc> {
  const response = await admin.post(`/api/${collection}?depth=0`, { headers: adminHeaders, data })
  expect(response.status(), `create ${collection}: ${await response.text()}`).toBe(201)
  const doc = ((await response.json()) as { doc: Doc }).doc
  created.push({ collection, id: doc.id })
  return doc
}

async function anyBuildId(): Promise<number> {
  const list = (await (await admin.get('/api/builds?limit=1&depth=0')).json()) as List
  return list.docs[0]!.id
}

test.beforeAll(async ({ playwright, baseURL }) => {
  const email = process.env.SEED_ADMIN_EMAIL
  const pass = process.env.SEED_ADMIN_PASSWORD
  if (!email || !pass) throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set.')
  const session = await login(playwright, baseURL, 'users', email, pass)
  expect(session.response.status()).toBe(200)
  admin = session.context
  const { token } = (await session.response.json()) as { token: string }
  adminHeaders = { Authorization: `JWT ${token}` }
})

test.afterAll(async () => {
  // Tickets before units, units before orders' references are gone — reverse order of creation.
  for (const { collection, id } of [...created].reverse()) {
    await admin.delete(`/api/${collection}/${id}`, { headers: adminHeaders })
  }
  await admin.dispose()
})

test('anonymous visitors read none of the G14 collections nor panel accounts', async ({
  request,
}) => {
  for (const collection of ['orders', 'units', 'tickets', 'customers', 'users']) {
    const response = await request.get(`/api/${collection}?limit=1`)
    expect(response.status(), collection).toBe(403)
  }
})

test('nobody opens a verified customer account through REST, signed in or not', async ({
  request,
  playwright,
  baseURL,
}) => {
  const forged = { email: mail('forged'), password: password(), name: 'X', _verified: true }
  expect((await request.post('/api/customers', { data: forged })).status()).toBe(403)

  // A signed-in customer must not either: Payload's `_verified` field trusts any signed-in user.
  const pass = password()
  await create('customers', { email: mail('signed'), password: pass, name: 'S', _verified: true })
  const { context, response } = await login(playwright, baseURL, 'customers', mail('signed'), pass)
  expect(response.status()).toBe(200)
  expect((await context.post('/api/customers', { data: forged })).status()).toBe(403)
  // …nor a panel account.
  const staff = { email: mail('staff-forged'), password: password(), role: 'admin' }
  expect((await context.post('/api/users', { data: staff })).status()).toBe(403)
  await context.dispose()
})

test('the workshop strip shows build, colour and stage only', async ({ request }) => {
  const build = await anyBuildId()
  await create('orders', { build, stage: 'assembly', name: 'Zofia', email: mail('strip') })
  const response = await request.get('/api/warsztat')
  expect(response.status()).toBe(200)
  const body = await response.text()
  expect(body).not.toContain('@')
  expect(body).not.toContain('Zofia')
  const { items } = JSON.parse(body) as { items: Record<string, unknown>[] }
  expect(items.length).toBeGreaterThan(0)
  for (const item of items)
    expect(Object.keys(item).sort()).toEqual(['key', 'name', 'slug', 'stage', 'text'])
})

test('serwis runs the workshop but sees no inquiries, costs or settings', async ({
  playwright,
  baseURL,
}) => {
  const pass = password()
  const user = await create('users', { email: mail('serwis'), password: pass, role: 'serwis' })
  expect(user.role).toBe('serwis')
  const { context, response } = await login(playwright, baseURL, 'users', mail('serwis'), pass)
  expect(response.status()).toBe(200)

  expect((await context.get('/api/orders?limit=1')).status()).toBe(200)
  expect((await context.get('/api/units?limit=1')).status()).toBe(200)
  expect((await context.get('/api/tickets?limit=1')).status()).toBe(200)
  expect((await context.get('/api/inquiries?limit=1')).status()).toBe(403)
  expect((await context.get('/api/stock?limit=1')).status()).toBe(403)
  expect((await context.get('/api/globals/pricing-settings')).status()).toBe(403)
  expect((await context.get('/api/customers?limit=1')).status()).toBe(403)

  const options = await (await context.get('/api/options?limit=100&depth=0')).text()
  expect(options).not.toContain('"cost":')
  expect(options).not.toContain('"internalModel":')

  // Cannot promote itself, cannot add accounts.
  await context.patch(`/api/users/${user.id}`, { data: { role: 'admin' } })
  const after = (await (
    await admin.get(`/api/users/${user.id}?depth=0`, { headers: adminHeaders })
  ).json()) as Doc
  expect(after.role).toBe('serwis')
  const extra = { email: mail('serwis-extra'), password: password(), role: 'admin' }
  expect((await context.post('/api/users', { data: extra })).status()).toBe(403)
  await context.dispose()
})

test('a customer sees only their own orders, units and tickets', async ({
  playwright,
  baseURL,
}) => {
  const build = await anyBuildId()
  const passA = password()
  const a = await create('customers', {
    email: mail('a'),
    password: passA,
    name: 'A',
    _verified: true,
  })
  await create('customers', { email: mail('b'), password: password(), name: 'B', _verified: true })

  // E-mails in other casing: records join on the normalised address (panel spec §6).
  const unitA = await create('units', { build, email: mail('a').toUpperCase() })
  const unitB = await create('units', { build, email: mail('b') })
  const orderA = await create('orders', { build, name: 'A', email: mail('a'), unit: unitA.id })
  const orderB = await create('orders', { build, name: 'B', email: mail('b'), unit: unitB.id })
  await create('tickets', {
    unit: unitB.id,
    category: 'other',
    description: 'B',
    email: mail('b'),
  })

  const { context, response } = await login(playwright, baseURL, 'customers', mail('a'), passA)
  expect(response.status()).toBe(200)

  const orders = (await (await context.get('/api/orders?depth=0&limit=100')).json()) as List
  expect(orders.docs.map((d) => d.id)).toEqual([orderA.id])
  // Internal fields stay in the panel.
  for (const key of ['email', 'inquiry', 'customer', 'workshopNote']) {
    expect(orders.docs[0], key).not.toHaveProperty(key)
  }
  // Payload 3.91 puts back an empty array after field access removed an array field (as with
  // `components` in G3): no rows, no data — only that empty value is tolerated.
  expect(orders.docs[0]?.checklist ?? []).toEqual([])
  expect((await context.get(`/api/orders/${orderB.id}?depth=0`)).status()).not.toBe(200)

  const units = (await (await context.get('/api/units?depth=0&limit=100')).json()) as List
  expect(units.docs.map((d) => d.id)).toEqual([unitA.id])
  // `depth` must not open B's unit through A's order either.
  const deep = await (await context.get(`/api/orders/${orderA.id}?depth=2`)).text()
  expect(deep).not.toContain(String(unitB.code))

  const tickets = (await (await context.get('/api/tickets?depth=0')).json()) as List
  expect(tickets.totalDocs).toBe(0)

  const accounts = (await (await context.get('/api/customers?depth=0')).json()) as List
  expect(accounts.docs.map((d) => d.id)).toEqual([a.id])

  expect((await context.get('/api/inquiries?limit=1')).status()).toBe(403)
  expect((await context.get('/api/users?limit=1')).status()).toBe(403)
  // Never the panel. Payload leaves `false` out of /api/access, so "not true" is the check; the
  // admin is the positive control.
  const access = (await (await context.get('/api/access')).json()) as { canAccessAdmin?: boolean }
  expect(access.canAccessAdmin).not.toBe(true)
  const adminAccess = (await (
    await admin.get('/api/access', { headers: adminHeaders })
  ).json()) as { canAccessAdmin?: boolean }
  expect(adminAccess.canAccessAdmin).toBe(true)
  // Writes go through the site's own routes only.
  expect((await context.post('/api/tickets', { data: { unit: unitA.id } })).status()).toBe(403)
  expect((await context.patch(`/api/customers/${a.id}`, { data: { name: 'Hack' } })).status()).toBe(
    403,
  )
  await context.dispose()
})

test('an account that has not verified its e-mail cannot sign in', async ({
  playwright,
  baseURL,
}) => {
  const pass = password()
  await create('customers', { email: mail('c'), password: pass, name: 'C', _verified: false })
  const { context, response } = await login(playwright, baseURL, 'customers', mail('c'), pass)
  expect(response.status()).not.toBe(200)
  await context.dispose()
})

test('the certificate code is set by the system only', async () => {
  const build = await anyBuildId()
  const unit = await create('units', { build, code: 'AAAA-AAAA-AAAA-AAAA', number: 99 })
  expect(unit.code).not.toBe('AAAA-AAAA-AAAA-AAAA')
  expect(String(unit.code)).toMatch(/^[2-9A-HJKMNP-Z]{4}(-[2-9A-HJKMNP-Z]{4}){3}$/)
  expect(unit.number).not.toBe(99)
})

test('a build with units and a unit with tickets cannot be deleted (clear message)', async () => {
  // A throwaway build would need a full recipe; the seed build with its seed unit is enough.
  const builds = (await (
    await admin.get('/api/builds?where[slug][equals]=wampir&depth=0')
  ).json()) as List
  const build = builds.docs[0]!.id
  const refused = await admin.delete(`/api/builds/${build}`, { headers: adminHeaders })
  expect(refused.status()).toBe(400)
  expect(await refused.text()).toContain('egzemplarze tego zestawu')

  const unit = await create('units', { build })
  await create('tickets', {
    unit: unit.id,
    category: 'other',
    description: 'x',
    email: mail('del'),
  })
  const blocked = await admin.delete(`/api/units/${unit.id}`, { headers: adminHeaders })
  expect(blocked.status()).toBe(400)
  expect(await blocked.text()).toContain('zgłoszenia tego egzemplarza')
})
