import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

import { ADMIN_STATE, adminHeaders } from './helpers/adminSession'

/**
 * Prices in the panel (P6, panel spec §8, boards Ceny and Publikacja, stany/tel-05): Centrum cen
 * at /admin/ceny and „Do zatwierdzenia” at /admin/ceny/zatwierdzanie. Admin only; the live guard
 * blocks a selection under 11% and an approved one becomes the newest batch. The publishing test
 * changes costs and publishes twice — there and back — so the database ends with the seed prices.
 */

type Doc = Record<string, unknown> & { id: number }
type List<T = Doc> = { docs: T[] }
type Level = Doc & { code: string; components: { role: string; cost: number }[] }
type Price = { itemType: string; itemCode: string; sellPrice: number; batch: number }

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

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

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

test('anonymous visitor sees no prices, only a way to log in', async ({ page }) => {
  for (const path of ['/admin/ceny', '/admin/ceny/zatwierdzanie']) {
    await page.goto(path)
    await expect(page.getByText('Ten ekran jest tylko dla pracowników PRO-KOM.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Zaloguj się do panelu' })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('zł')
  }
})

test.describe('signed in as admin', () => {
  test.use({ storageState: ADMIN_STATE })

  test('Centrum cen: tiles, „Co jeśli?”, positions with filters', async ({ page, isMobile }) => {
    await page.goto('/admin/ceny')
    await expect(page.getByRole('heading', { level: 1, name: 'Centrum cen' })).toBeVisible()
    for (const label of ['Pozycje w cenniku', 'Niedostępne', 'Ostatnie sprawdzenie']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(page.getByText(/^Zmienione od \d\d\.\d\d$/)).toBeVisible()
    await expect(page.getByText('16 poziomów (64 części), 57 opcji, usługa')).toBeVisible()

    // „Co jeśli?”: RAM +25% lowers the average margin of the builds; „Wyzeruj” brings it back.
    const whatIf = page.getByRole('region', { name: 'Co jeśli?' })
    const average = whatIf.locator('dd').first()
    const before = await average.textContent()
    await whatIf.getByLabel('RAM').fill('0.25')
    await expect(average).not.toHaveText(before!)
    await whatIf.getByRole('button', { name: 'Wyzeruj' }).click()
    await expect(average).toHaveText(before!)

    // Positions: every sold item, by category.
    const positions = page.getByRole('region', { name: 'Pozycje' })
    await positions.getByRole('button', { name: /^Wszystkie/ }).click()
    const rows = positions.locator('tbody tr')
    await expect(rows).toHaveCount(74)
    await positions.getByRole('radio', { name: /^RAM/ }).click()
    await expect(rows).toHaveCount(7)
    await expect(rows.first()).toContainText(/\d zł/)

    await expect(page.getByRole('link', { name: /Do zatwierdzenia · \d+/ })).toHaveAttribute(
      'href',
      '/admin/ceny/zatwierdzanie',
    )
    if (isMobile) await noSidewaysScroll(page)

    const { violations } = await new AxeBuilder({ page })
      .include('[data-prices-screen]')
      .withTags(AXE_TAGS)
      .analyze()
    expect(violations).toEqual([])
  })

  test('Do zatwierdzenia with nothing queued: the empty state, axe', async ({ page, isMobile }) => {
    await page.goto('/admin/ceny/zatwierdzanie')
    await expect(page.getByRole('heading', { level: 1, name: 'Do zatwierdzenia' })).toBeVisible()
    await expect(page.getByText('Nic nie czeka na zatwierdzenie')).toBeVisible()
    if (isMobile) await noSidewaysScroll(page)
    const { violations } = await new AxeBuilder({ page })
      .include('[data-prices-screen]')
      .withTags(AXE_TAGS)
      .analyze()
    expect(violations).toEqual([])
  })
})

test.describe('publication', () => {
  // Writes to the database: once per project, run serially (db-writers). The phone project
  // checks the cards and the action under the thumb on the same flow.
  test.use({ storageState: ADMIN_STATE })

  // `storageState` signs in the `request` fixture too, so the public API is checked from an
  // anonymous context of its own; the panel token lives in another one.
  let panel: APIRequestContext
  let anon: APIRequestContext
  let headers: Record<string, string>
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

  const guard = (page: Page) => page.getByRole('region', { name: 'Strażnik marży' })
  const publishButton = (page: Page, isMobile: boolean) =>
    (isMobile ? page.getByRole('region', { name: 'Akcja ekranu' }) : guard(page)).getByRole(
      'button',
      { name: /^Opublikuj \d+/ },
    )

  test.beforeAll(async ({ playwright, baseURL }) => {
    panel = await playwright.request.newContext({ baseURL })
    anon = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    })
    headers = adminHeaders()
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
    await anon.dispose()
    const page = await browser.newPage({
      storageState: ADMIN_STATE,
      viewport: { width: 1440, height: 900 },
    })
    await page.goto('/admin/ceny/zatwierdzanie')
    if (await page.getByText('Nic nie czeka na zatwierdzenie').isHidden()) {
      await expect(guard(page).getByText('można publikować', { exact: true })).toBeVisible()
      await publishButton(page, false).click()
      await expect(page.getByText('Nic nie czeka na zatwierdzenie')).toBeVisible()
    }
    await page.close()
  })

  test('the live guard blocks a selection under the minimum margin, approval passes', async ({
    page,
    isMobile,
  }) => {
    const before = await newestBatch(anon)
    const p01Cost = original.p01.components.reduce((sum, c) => sum + c.cost, 0)
    // P01 parts +12% (the old price now breaks 11%) and RAM 32 GB +300 zł (above the 3% threshold).
    await setCosts(Math.round(p01Cost * 0.12), 300)

    await page.goto('/admin/ceny')
    await expect(
      page.getByText('Pilne: opublikowane ceny przy dzisiejszych kosztach łamią marżę.'),
    ).toBeVisible()

    await page.goto('/admin/ceny/zatwierdzanie')
    const p01 = page.getByRole('checkbox', { name: /Publikuj: P01 ·/ })
    const r32 = page.getByRole('checkbox', { name: /Publikuj: 32 GB DDR5 6000 CL30/ })
    await expect(p01).toBeChecked()
    await expect(r32).toBeChecked()
    await expect(guard(page).getByText('można publikować', { exact: true })).toBeVisible()

    // Only the RAM: P01 keeps its old price and stays under the floor → blocked, nothing written.
    await p01.uncheck()
    await expect(guard(page).getByText('publikacja zablokowana', { exact: true })).toBeVisible()
    await expect(guard(page)).toContainText(/Zatwierdź nową cenę poziomu P01 \([\d\s ]+ zł\)/)
    await expect(publishButton(page, isMobile)).toBeDisabled()
    // The action under the thumb shows the guard's number (spec §2a pt 6).
    const lowest = await guard(page).locator('dd').first().textContent()
    await expect(page.locator('.pn-mact__v b')).toHaveText(lowest!)
    expect((await newestBatch(anon))[0]!.batch).toBe(before[0]!.batch)

    // With the level ticked again the guard passes and the site gets a new batch.
    await p01.check()
    await expect(guard(page).getByText('można publikować', { exact: true })).toBeVisible()
    await publishButton(page, isMobile).click()
    await expect(page.getByText(`Opublikowano partię ${before[0]!.batch + 1}`)).toBeVisible()

    const after = await newestBatch(anon)
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
