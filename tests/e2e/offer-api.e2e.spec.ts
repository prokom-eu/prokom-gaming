import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

/**
 * Costs, internal models, EANs and markups never reach the public REST API (ADR-G002 §8.7,
 * spec. §27.2). The list of internal models is read from the database through the panel account
 * (power-level parts, RAM and SSD; cases and coolers are shown by full name on purpose) — the same
 * account is the positive control: it does see the hidden fields. FPS results (G5) carry the
 * names of the level's CPU and GPU (`cpu`, `gpu`) — panel only as well.
 */

// The API does not depend on the viewport: one project is enough.
test.skip(({ isMobile }) => isMobile, 'API test runs in the desktop project only')

const HIDDEN_KEYS = [
  'cost',
  'costAtPublish',
  'components',
  'internalModel',
  'internalRef',
  'ean',
  'markupClass',
  'markupOverride',
  'publishedBy',
  'cpu',
  'gpu',
]

const PUBLIC_LISTS = [
  { path: '/api/power-levels?limit=100&depth=2', count: 16 },
  { path: '/api/options?limit=100&depth=1', count: 57 },
  { path: '/api/builds?limit=100&depth=2', count: 16 },
  { path: '/api/media?limit=100', count: 46 },
  { path: '/api/games?limit=100', count: 33 },
  { path: '/api/fps-results?limit=2000&depth=1', count: 1584 },
]

type Doc = Record<string, unknown>
type List = { docs: Doc[]; totalDocs: number }

let internalModels: string[] = []

async function adminToken(request: APIRequestContext): Promise<string> {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set.')
  const response = await request.post('/api/users/login', { data: { email, password } })
  expect(response.status()).toBe(200)
  return ((await response.json()) as { token: string }).token
}

function expectNothingHidden(path: string, body: string): void {
  // In a populated power level Payload 3.91 puts back an empty array after field access removed
  // `components` (afterRead: arrays without rows become `[]`). It carries no data, so only that
  // exact empty value is tolerated; any element still fails below.
  const withoutEmptyParts = body.replaceAll('"components":[]', '')
  for (const key of HIDDEN_KEYS) {
    // As a key (`"cpu":`), not a value: a part's `role` may be "cpu".
    expect(withoutEmptyParts, `${path}: key ${key}`).not.toContain(`"${key}":`)
  }
  for (const model of internalModels) expect(body, `${path}: ${model}`).not.toContain(model)
}

test.describe('public offer API', () => {
  test.beforeAll(async ({ playwright, baseURL }) => {
    // Own context: the login cookie must not reach the anonymous requests of the tests.
    const panel = await playwright.request.newContext({ baseURL })
    const headers = { Authorization: `JWT ${await adminToken(panel)}` }

    const levels = (await (
      await panel.get('/api/power-levels?limit=100&depth=0', { headers })
    ).json()) as List
    const options = (await (
      await panel.get('/api/options?limit=100&depth=0', { headers })
    ).json()) as List

    // Positive control: the panel sees the hidden fields, so their absence below means something.
    const p01 = levels.docs.find((d) => d.code === 'P01') as
      { components: { internalModel: string; cost: number }[]; markupOverride: number } | undefined
    expect(p01?.components).toHaveLength(4)
    expect(p01?.components[0]?.cost).toBeGreaterThan(0)
    expect(p01?.markupOverride).toBe(0.168)

    internalModels = [
      ...levels.docs.flatMap((d) =>
        (d.components as { internalModel: string }[]).map((c) => c.internalModel),
      ),
      ...options.docs
        .filter((d) => d.type === 'ram' || d.type === 'ssd')
        .map((d) => d.internalModel as string),
    ]
    expect(internalModels).toHaveLength(16 * 4 + 7 + 4)

    const fps = (await (
      await panel.get('/api/fps-results?limit=1&depth=0', { headers })
    ).json()) as List
    expect(fps.docs[0]?.gpu).toEqual(expect.any(String))

    const settings = await panel.get('/api/globals/pricing-settings', { headers })
    expect(settings.status()).toBe(200)
    expect(((await settings.json()) as { minMargin: number }).minMargin).toBe(0.11)

    // Prices are written only by publication (G4), not even by the panel through the API.
    const forged = await panel.post('/api/published-prices', {
      headers,
      data: {
        batch: 99,
        itemType: 'level',
        itemCode: 'P01',
        sellPrice: 1,
        publishedAt: new Date(),
      },
    })
    expect(forged.status()).toBe(403)

    await panel.dispose()
  })

  for (const { path, count } of PUBLIC_LISTS) {
    test(`${path} is public and shows no costs or internal models`, async ({ request }) => {
      const response = await request.get(path)
      expect(response.status()).toBe(200)
      const body = await response.text()
      expect((JSON.parse(body) as List).totalDocs).toBe(count)
      expectNothingHidden(path, body)
    })
  }

  // Every publication adds a batch (G4), so only the newest one has a known size.
  test('the newest price batch is public: 90 prices, no costs', async ({ request }) => {
    const newest = (await (
      await request.get('/api/published-prices?sort=-batch&limit=1')
    ).json()) as List
    const batch = Number(newest.docs[0]?.batch)
    expect(batch).toBeGreaterThanOrEqual(1)
    const path = `/api/published-prices?limit=200&where[batch][equals]=${batch}`
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect((JSON.parse(body) as List).totalDocs).toBe(90)
    expectNothingHidden(path, body)
  })

  test('a single build with deep population shows nothing hidden', async ({ request }) => {
    const list = (await (await request.get('/api/builds?limit=1&depth=0')).json()) as List
    const path = `/api/builds/${String(list.docs[0]?.id)}?depth=3`
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    expectNothingHidden(path, await response.text())
  })

  test('a single FPS result with deep population shows nothing hidden', async ({ request }) => {
    const list = (await (await request.get('/api/fps-results?limit=1&depth=0')).json()) as List
    const path = `/api/fps-results/${String(list.docs[0]?.id)}?depth=3`
    const response = await request.get(path)
    expect(response.status()).toBe(200)
    expectNothingHidden(path, await response.text())
  })

  test('hidden fields cannot be filtered or sorted on', async ({ request }) => {
    for (const path of [
      '/api/power-levels?where[components.cost][greater_than]=0',
      '/api/power-levels?where[components.internalModel][like]=a',
      '/api/power-levels?where[markupOverride][exists]=true',
      '/api/options?where[cost][less_than]=1000',
      '/api/options?sort=cost',
      '/api/published-prices?sort=-costAtPublish',
      '/api/options?where[internalModel][like]=a',
      '/api/builds?where[internalRef][exists]=true',
      // Through a relation: the related collection's field access applies too.
      '/api/builds?where[level.components.cost][greater_than]=0',
      '/api/builds?where[ram.internalModel][like]=a',
      '/api/fps-results?where[gpu][like]=RTX',
      '/api/fps-results?sort=cpu',
      '/api/fps-results?where[build.level.components.internalModel][like]=a',
    ]) {
      expect((await request.get(path)).status(), path).toBe(400)
    }
  })

  test('price history and pricing settings are panel-only', async ({ request }) => {
    expect((await request.get('/api/price-history')).status()).toBe(403)
    expect((await request.get('/api/globals/pricing-settings')).status()).toBe(403)
  })

  test('site settings are public', async ({ request }) => {
    const response = await request.get('/api/globals/site-settings')
    expect(response.status()).toBe(200)
    expect(((await response.json()) as { company: { nip: string } }).company.nip).toBe(
      '735-251-14-47',
    )
  })

  test('visitors cannot change the offer', async ({ request }) => {
    expect((await request.post('/api/options', { data: { code: 'X' } })).status()).toBe(403)
    expect((await request.post('/api/published-prices', { data: {} })).status()).toBe(403)
    expect((await request.post('/api/games', { data: { name: 'X' } })).status()).toBe(403)
    expect((await request.post('/api/fps-results', { data: { fps: 999 } })).status()).toBe(403)
  })
})
