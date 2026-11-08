import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

/**
 * The panel cannot break a build recipe or the pricing rules (review notes of G3/G4): a part used
 * in a build cannot be deleted or switched off, and pricing settings reject values the formulas
 * cannot work with. Games and builds with FPS results cannot be deleted, and one build × game ×
 * resolution keeps a single test number (G5). Each test puts things back if a guard ever lets a
 * change through.
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

test('a build cannot point at an inactive option', async () => {
  const builds = (await (await panel.get('/api/builds?depth=0&limit=100', { headers })).json()) as {
    docs: (Doc & { ram: number })[]
  }
  const rams = (await (
    await panel.get('/api/options?depth=0&limit=100&where[type][equals]=ram', { headers })
  ).json()) as List
  const used = new Set(builds.docs.map((b) => b.ram))
  const unused = rams.docs.find((o) => !used.has(o.id))!
  const build = builds.docs[0]!
  try {
    const off = await panel.patch(`/api/options/${unused.id}`, { headers, data: { active: false } })
    expect(off.status()).toBe(200)
    const response = await panel.patch(`/api/builds/${build.id}`, {
      headers,
      data: { ram: unused.id },
    })
    expect(response.status()).toBe(400)
    const after = (await (
      await panel.get(`/api/builds/${build.id}?depth=0`, { headers })
    ).json()) as {
      ram: number
    }
    expect(after.ram).toBe(build.ram)
  } finally {
    await panel.patch(`/api/builds/${build.id}`, { headers, data: { ram: build.ram } })
    await panel.patch(`/api/options/${unused.id}`, { headers, data: { active: true } })
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

test('a game or build with FPS results cannot be deleted (message instead of a 500)', async () => {
  // 16 builds × 3 resolutions for a game, 33 games × 3 for a build.
  for (const [collection, field, value, results] of [
    ['games', 'slug', 'fortnite', 48],
    ['builds', 'slug', 'wampir', 99],
  ] as const) {
    const doc = await findOne(collection, field, value)
    const response = await panel.delete(`/api/${collection}/${doc.id}`, { headers })
    expect(response.status(), `${collection} ${value}`).toBe(400)
    expect(await response.text()).toContain(`${results} wyników FPS`)
    await findOne(collection, field, value) // still there
  }
})

test('one test number per build × game × resolution; measurements need a date', async () => {
  const test = (await (
    await panel.get('/api/fps-results?limit=1&depth=0&where[kind][equals]=m', { headers })
  ).json()) as List
  const { build, game, resolution } = test.docs[0]!
  const base = { build, game, resolution, fps: 1, sourceLabel: 'e2e', setting: 'e2e' }
  const created: number[] = []
  try {
    const second = await panel.post('/api/fps-results', { headers, data: { ...base, kind: 'e' } })
    if (second.ok()) created.push(((await second.json()) as { doc: Doc }).doc.id)
    expect(second.status()).toBe(400)
    expect(await second.text()).toContain('ma już wynik z testu albo szacunek')

    const undated = await panel.post('/api/fps-results', { headers, data: { ...base, kind: 'p' } })
    if (undated.ok()) created.push(((await undated.json()) as { doc: Doc }).doc.id)
    expect(undated.status()).toBe(400)
    expect(await undated.text()).toContain('Pomiar PRO-KOM musi mieć datę.')

    // A dated measurement is accepted next to the test number (the site then prefers it).
    const measured = await panel.post('/api/fps-results', {
      headers,
      data: { ...base, kind: 'p', measuredAt: '2026-11-25T10:00:00.000Z' },
    })
    if (measured.ok()) created.push(((await measured.json()) as { doc: Doc }).doc.id)
    expect(measured.status()).toBe(201)
  } finally {
    for (const id of created) await panel.delete(`/api/fps-results/${id}`, { headers })
  }
})
