import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

/**
 * The panel cannot break a build recipe or the pricing rules (review notes of G3/G4): a part used
 * in a build cannot be deleted or switched off, and pricing settings reject values the formulas
 * cannot work with. Each test puts things back if a guard ever lets a change through.
 */

test.skip(({ isMobile }) => isMobile, 'API test runs in the desktop project only')

type Doc = { id: number; [key: string]: unknown }
type List = { docs: Doc[] }

let panel: APIRequestContext
let headers: { Authorization: string }

async function findOne(collection: string, field: string, value: string): Promise<Doc> {
  const list = (await (
    await panel.get(`/api/${collection}?depth=0&where[${field}][equals]=${value}`, { headers })
  ).json()) as List
  expect(list.docs).toHaveLength(1)
  return list.docs[0]!
}

test.beforeAll(async ({ playwright, baseURL }) => {
  panel = await playwright.request.newContext({ baseURL })
  const login = await panel.post('/api/users/login', {
    data: { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD },
  })
  expect(login.status()).toBe(200)
  headers = { Authorization: `JWT ${((await login.json()) as { token: string }).token}` }
})

test.afterAll(async () => {
  await panel.dispose()
})

test('a part used in a build cannot be deleted (message instead of a 500)', async () => {
  // LB500 (case) and P13 (level) are in Wampir.
  for (const [collection, code] of [
    ['options', 'LB500'],
    ['power-levels', 'P13'],
  ] as const) {
    const doc = await findOne(collection, 'code', code)
    const response = await panel.delete(`/api/${collection}/${doc.id}`, { headers })
    expect(response.status(), `${collection} ${code}`).toBe(400)
    expect(await response.text()).toContain('używane w zestawie: Wampir')
    await findOne(collection, 'code', code) // still there
  }
})

test('an option used in a build cannot be switched off', async () => {
  const lb500 = await findOne('options', 'code', 'LB500')
  try {
    const response = await panel.patch(`/api/options/${lb500.id}`, {
      headers,
      data: { active: false },
    })
    expect(response.status()).toBe(400)
    expect(await response.text()).toContain('Opcja jest w zestawie: Wampir')
    expect((await findOne('options', 'code', 'LB500')).active).toBe(true)
  } finally {
    await panel.patch(`/api/options/${lb500.id}`, { headers, data: { active: true } })
  }
})

test('pricing settings reject a zero rounding step and a margin above 50%', async () => {
  const settings = (await (
    await panel.get('/api/globals/pricing-settings', { headers })
  ).json()) as {
    roundingStep: number
    minMargin: number
  }
  try {
    for (const data of [{ roundingStep: 0 }, { minMargin: 0.6 }]) {
      const response = await panel.post('/api/globals/pricing-settings', { headers, data })
      expect(response.status(), JSON.stringify(data)).toBe(400)
    }
  } finally {
    await panel.post('/api/globals/pricing-settings', {
      headers,
      data: { roundingStep: settings.roundingStep, minMargin: settings.minMargin },
    })
  }
})
