import { expect, test, type Page } from '@playwright/test'

import pricingExpected from '../fixtures/pricing-expected.json' with { type: 'json' }
import { expectNoHiddenOffer, panelInternalModels } from './helpers/hiddenOffer'

/**
 * „Wszystkie zestawy” (G9, spec. §5, boards Zestawy / Zestawy-telefon, `stany/tel-03`, `tel-04`):
 * 16 cards by price with the published price and a source next to every FPS number, filters in
 * the address (click and direct entry), the empty result, and on a phone the sticky monitor chips
 * and the filters sheet.
 */

const price = (text: string) => Number(text.replace(/\D/g, ''))
const names = (page: Page) => page.locator('.bl-card__name').allTextContents()
const count = (page: Page) => page.locator('.bl-count')
// The phone project has touch, where the mouse wheel does not scroll: move the window instead
// (the header listens to the same `scroll` events).
const scrollTo = (page: Page, y: number) => page.evaluate((top) => window.scrollTo({ top }), y)

test('16 cards by price with the fixture prices, every FPS number with its source', async ({
  page,
}) => {
  await page.goto('/zestawy')
  await expect(page.getByRole('heading', { level: 1, name: 'Wszystkie zestawy' })).toBeVisible()
  const expected = [...pricingExpected.builds].sort((a, b) => a.price - b.price)
  expect(await names(page)).toEqual(expected.map((b) => b.name))
  const prices = await page.locator('.bl-card__p b').allTextContents()
  expect(prices.map(price)).toEqual(expected.map((b) => b.price))
  const fps = page.locator('.bl-card__fps')
  await expect(fps).toHaveCount(16)
  for (const row of await fps.all()) await expect(row.locator('.src')).toHaveCount(1)
  // The card leads to the build page.
  await expect(page.getByRole('link', { name: 'Wampir', exact: true })).toHaveAttribute(
    'href',
    '/zestawy/wampir',
  )
})

test.describe('desktop filters', () => {
  test.skip(({ isMobile }) => isMobile, 'the filter bar is the desktop layout')

  test('a click filters, counts and writes the address', async ({ page }) => {
    await page.goto('/zestawy')
    const group = (label: string) => page.getByRole('group', { name: label })
    await expect(count(page)).toHaveText('16 zestawów')

    await group('Monitor').getByRole('button', { name: '2K', exact: true }).click()
    await expect(page).toHaveURL(/\/zestawy\?monitor=2k$/)
    await expect(count(page)).toHaveText('9 zestawów')

    await group('Rodzaj').getByRole('button', { name: 'Białe' }).click()
    await expect(page).toHaveURL(/\?monitor=2k&rodzaj=biale$/)
    await expect(count(page)).toHaveText('2 zestawy')
    expect(await names(page)).toEqual(['Rusałka', 'Pani Zimy'])
    await expect(group('Rodzaj').getByRole('button', { name: 'Białe' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await group('Budżet').getByRole('button', { name: 'ponad 15 tys.' }).click()
    await expect(page.locator('.bl-empty')).toContainText('Żaden zestaw nie pasuje do tych filtrów')
    // Announced in the live region shared by both layouts.
    await expect(page.locator('[aria-live="polite"]')).toHaveText(
      'Żaden zestaw nie pasuje do tych filtrów',
    )
    await page.getByRole('button', { name: 'Wyczyść filtry' }).click()
    await expect(page).toHaveURL(/\/zestawy$/)
    await expect(count(page)).toHaveText('16 zestawów')
  })
})

test('filters from the address are applied before any script runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/zestawy?monitor=4k&budzet=od15&rodzaj=nieznany')
  expect(await names(page)).toEqual(['Weles', 'Żmij', 'Perun'])
  await context.close()
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone layout (≤ 760 px)')

  test('monitor chips stick to the top, „Filtry” opens the sheet', async ({ page }) => {
    await page.goto('/zestawy')
    await expect(page.locator('.bl-filters')).toBeHidden()
    const quick = page.locator('.bl-quick')
    await quick.getByRole('button', { name: 'FullHD' }).click()
    await expect(page).toHaveURL(/\?monitor=fullhd$/)
    expect(await names(page)).toHaveLength(5)

    // Sticky while the cards scroll under it.
    await scrollTo(page, 1500)
    await expect.poll(async () => Math.round((await quick.boundingBox())?.y ?? -1)).toBe(0)

    await quick.getByRole('button', { name: /^Filtry/ }).click()
    const sheet = page.getByRole('dialog', { name: 'Filtry' })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: 'do 9 tys.' }).click()
    await expect(sheet.getByRole('button', { name: 'Pokaż 5 zestawów' })).toBeVisible()
    await sheet.getByRole('button', { name: 'AMD' }).click()
    await sheet.getByRole('button', { name: 'Pokaż 4 zestawy' }).click()
    await expect(sheet).toBeHidden()
    await expect(page).toHaveURL(/\?monitor=fullhd&budzet=do9&rodzaj=amd$/)
    expect(await names(page)).toEqual(['Skrzat', 'Licho', 'Bies', 'Strzyga'])
    await expect(quick.getByRole('button', { name: 'Filtry, aktywne: 2' })).toBeVisible()
  })

  test('the monitor chips stay under the header when it comes back', async ({ page }) => {
    await page.goto('/zestawy')
    const quick = page.locator('.bl-quick')
    const nav = page.locator('.nav')
    // Down: the header hides, the chips stick to the very top.
    // After hydration, or the header has no scroll listener yet; two steps = a downward delta.
    await page.waitForLoadState('networkidle')
    await scrollTo(page, 800)
    await scrollTo(page, 1500)
    await expect(nav).toHaveAttribute('data-hidden', 'true')
    await expect.poll(async () => Math.round((await quick.boundingBox())?.y ?? -1)).toBe(0)
    // Up a little: the header returns and the chips slide below it, not under it.
    await scrollTo(page, 1300)
    await expect(nav).toHaveAttribute('data-hidden', 'false')
    await expect
      .poll(async () => {
        const [n, q] = await Promise.all([nav.boundingBox(), quick.boundingBox()])
        return n && q ? Math.round(q.y - (n.y + n.height)) : -999
      })
      .toBeGreaterThanOrEqual(0)
  })

  test('„Zestawy” in the tab bar clears the filters (soft navigation)', async ({ page }) => {
    await page.goto('/zestawy?monitor=2k')
    expect(await names(page)).toHaveLength(9)
    await page
      .getByRole('navigation', { name: 'Nawigacja główna' })
      .getByRole('link', { name: 'Zestawy' })
      // Enter, not a click: in `next dev` the dev-tools button sits over this tab.
      .press('Enter')
    await expect(page).toHaveURL(/\/zestawy$/)
    await expect.poll(async () => (await names(page)).length).toBe(16)
    await expect(
      page.locator('.bl-quick').getByRole('button', { name: 'Wszystkie' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  test('the page does not scroll sideways', async ({ page }) => {
    await page.goto('/zestawy')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
  })
})

test('the page carries no cost or internal model', async ({ page, playwright, baseURL }) => {
  const internalModels = await panelInternalModels(playwright, baseURL)
  const response = await page.goto('/zestawy')
  expect(response?.status()).toBe(200)
  expectNoHiddenOffer(await response!.text(), internalModels)
})
