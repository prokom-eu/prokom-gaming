import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

/**
 * Prices screen in the panel (/admin/ceny, ADR-G002 §4): only staff see it, the queue shows what
 * changed, the margin guard blocks a publication under 11% and an approved one becomes the newest
 * batch. The publishing test changes costs and publishes twice — there and back — so the local
 * database ends with the seed prices again.
 */

type Doc = Record<string, unknown> & { id: number }
type List<T = Doc> = { docs: T[] }
type Level = Doc & { code: string; components: { role: string; cost: number }[] }
type Price = { itemType: string; itemCode: string; sellPrice: number; batch: number }

function credentials() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set.')
  return { email, password }
}

async function logIn(page: Page): Promise<void> {
  const { email, password } = credentials()
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(email)
  await page.locator('#field-password').fill(password)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/admin\/?$/)
}

async function adminHeaders(request: APIRequestContext) {
  const response = await request.post('/api/users/login', { data: credentials() })
  expect(response.status()).toBe(200)
  return { Authorization: `JWT ${((await response.json()) as { token: string }).token}` }
}

/** Newest batch from the public API, as the site sees it. */
async function newestBatch(request: APIRequestContext): Promise<Price[]> {
  const top = (await (
    await request.get('/api/published-prices?sort=-batch&limit=1')
  ).json()) as List<Price>
  const batch = top.docs[0]!.batch
  const all = (await (
    await request.get(`/api/published-prices?limit=200&where[batch][equals]=${batch}`)
  ).json()) as List<Price>
  return all.docs
}

const price = (rows: Price[], type: string, code: string) =>
  rows.find((r) => r.itemType === type && r.itemCode === code)?.sellPrice

test('anonymous visitor sees no prices, only a way to log in', async ({ page }) => {
  await page.goto('/admin/ceny')
  await expect(page.getByText('Ten ekran jest tylko dla pracowników PRO-KOM.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Zaloguj się do panelu' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('zł')
})

test('staff see the guard, the empty queue and 16 builds', async ({ page }) => {
  await logIn(page)
  await page.goto('/admin/ceny')
  await expect(page.getByRole('heading', { name: 'Ceny — publikacja i marże' })).toBeVisible()
  await expect(page.getByText(/Wszystkie [\d\s ]+ zgodnych konfiguracji ma marżę/)).toBeVisible()
  await expect(page.getByText('Brak pozycji do zatwierdzenia.')).toBeVisible()
  const builds = page.locator('section[aria-labelledby="builds"] tbody tr')
  await expect(builds).toHaveCount(16)
  await expect(builds.filter({ hasText: 'Wampir' })).toContainText('14 540 zł')
  await expect(page.getByRole('link', { name: 'Ceny — publikacja i marże' })).toBeAttached()

  const { violations } = await new AxeBuilder({ page })
    .include('[data-prices-screen]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(violations).toEqual([])
})

test.describe('publication', () => {
  // Writes to the database: once, in the desktop project.
  test.skip(({ isMobile }) => isMobile, 'publishes in the desktop project only')

  // Panel account in its own context: its login cookie must never reach the `request` fixture,
  // which checks the public API anonymously.
  let panel: APIRequestContext
  let headers: { Authorization: string }
  let original: { p01: Level; r32: Doc & { cost: number } }

  async function setCosts(p01Delta: number, r32Delta: number) {
    const level = await panel.patch(`/api/power-levels/${original.p01.id}`, {
      headers,
      data: {
        components: original.p01.components.map((c) =>
          c.role === 'gpu' ? { ...c, cost: c.cost + p01Delta } : c,
        ),
      },
    })
    expect(level.status()).toBe(200)
    const option = await panel.patch(`/api/options/${original.r32.id}`, {
      headers,
      data: { cost: original.r32.cost + r32Delta },
    })
    expect(option.status()).toBe(200)
  }

  async function publishAll(page: Page) {
    await page.goto('/admin/ceny')
    for (const box of await page.locator('table input[type="checkbox"]:not([disabled])').all()) {
      await box.check()
    }
    await page.getByRole('button', { name: 'Sprawdź marżę i opublikuj' }).click()
    await expect(page.getByText(/Opublikowano partię \d+/)).toBeVisible()
  }

  test.beforeAll(async ({ playwright, baseURL }) => {
    panel = await playwright.request.newContext({ baseURL })
    headers = await adminHeaders(panel)
    const levels = (await (
      await panel.get('/api/power-levels?where[code][equals]=P01&depth=0', { headers })
    ).json()) as List<Level>
    const options = (await (
      await panel.get('/api/options?where[code][equals]=R32&depth=0', { headers })
    ).json()) as List<Doc & { cost: number }>
    original = { p01: levels.docs[0]!, r32: options.docs[0]! }
  })

  test.afterAll(async ({ browser }) => {
    // Back to the seed costs and prices, whatever happened above.
    await setCosts(0, 0)
    await panel.dispose()
    const page = await browser.newPage()
    await logIn(page)
    await page.goto('/admin/ceny')
    if (await page.getByText('Brak pozycji do zatwierdzenia.').isHidden()) await publishAll(page)
    await page.close()
  })

  test('the guard blocks a publication under the minimum margin, approval passes', async ({
    page,
    request,
  }) => {
    const before = await newestBatch(request)
    const p01Cost = original.p01.components.reduce((sum, c) => sum + c.cost, 0)
    // P01 parts +12% (the old price now breaks 11%) and RAM 32 GB +300 zł (above the 3% threshold).
    await setCosts(Math.round(p01Cost * 0.12), 300)

    await logIn(page)
    await page.goto('/admin/ceny')
    await expect(
      page.getByText('Pilne: opublikowane ceny przy dzisiejszych kosztach łamią marżę.'),
    ).toBeVisible()
    const p01 = page.getByRole('checkbox', { name: /Poziom mocy P01/ })
    const r32 = page.getByRole('checkbox', { name: /Opcja R32/ })
    // Both urgent, so both start ticked: RAM's 15% markup is so close to the floor that a cost
    // rise worth more than the 3% threshold always breaks its own margin at the old price.
    await expect(p01).toBeChecked()
    await expect(r32).toBeChecked()

    // Only the RAM: P01 keeps its old price and stays under the floor → blocked.
    await p01.uncheck()
    await page.getByRole('button', { name: 'Sprawdź marżę i opublikuj' }).click()
    const blocked = page.locator('[data-prices-screen] [aria-live="polite"]')
    await expect(blocked).toContainText('Publikacja zablokowana — na stronie nic się nie zmieniło.')
    await expect(blocked).toContainText('Poziom P01')
    await expect(blocked).toContainText(/podnieś ją do min\. [\d\s ]+ zł/)
    expect((await newestBatch(request))[0]!.batch).toBe(before[0]!.batch)

    // With the level approved too, the guard passes and the site gets a new batch.
    await p01.check()
    await page.getByRole('button', { name: 'Sprawdź marżę i opublikuj' }).click()
    await expect(page.getByText(`Opublikowano partię ${before[0]!.batch + 1}`)).toBeVisible()

    const after = await newestBatch(request)
    expect(after).toHaveLength(90)
    expect(after[0]!.batch).toBe(before[0]!.batch + 1)
    expect(price(after, 'level', 'P01')).toBeGreaterThan(price(before, 'level', 'P01')!)
    expect(price(after, 'option', 'R32')).toBeGreaterThan(price(before, 'option', 'R32')!)
    expect(price(after, 'option', 'R16')).toBe(price(before, 'option', 'R16'))
    expect(JSON.stringify(after)).not.toContain('costAtPublish')

    // Price history (Omnibus): exactly one open entry per item, holding the new price.
    const open = (await (
      await panel.get(
        '/api/price-history?depth=0&where[itemType][equals]=level&where[itemCode][equals]=P01&where[validTo][exists]=false',
        { headers },
      )
    ).json()) as List<{ sellPrice: number; batch: number }>
    expect(open.docs).toHaveLength(1)
    expect(open.docs[0]).toMatchObject({
      sellPrice: price(after, 'level', 'P01'),
      batch: after[0]!.batch,
    })
  })
})
