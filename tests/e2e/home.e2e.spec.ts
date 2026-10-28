import { expect, test, type Page } from '@playwright/test'
import { expectNoHiddenOffer, panelInternalModels } from './helpers/hiddenOffer'

/**
 * Home hero and workshop strip (G7, spec. §4 pt 1–2, ADR-G003 §5): Wampir first, medallions and
 * the tier switcher, the automatic switch only on desktop and never with reduced motion, and no
 * cost or internal model in the page (ADR-G002 §8.7).
 */

const name = (page: Page) => page.locator('.hero__name')
const card = (page: Page) => page.locator('.hero-card')

async function gotoHome(page: Page) {
  await page.goto('/')
  await expect(card(page)).toBeVisible()
  // Hydrated: the medallions react to clicks only after React attached its handlers.
  await expect(page.locator('.hero')).toHaveAttribute('data-material', 'krew')
}

test('starts with Wampir: name, card, price and FPS with their source', async ({ page }) => {
  await gotoHome(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Komputery do gier. Sprawdzone w grach.',
  )
  await expect(name(page)).toHaveText('Wampir')
  await expect(card(page)).toContainText('Moc VII, 4K')
  await expect(card(page)).toContainText('2 komputery na tym poziomie')
  await expect(card(page)).toContainText('Ryzen 7 9800X3D')
  await expect(card(page)).toContainText(/\d{1,3}\s\d{3} zł/)
  await expect(card(page).locator('.hero-card__fps')).toHaveCount(2)
  await expect(card(page).locator('.src')).toHaveCount(2)
  await expect(card(page).getByRole('link', { name: 'Poznaj Wampira' })).toHaveAttribute(
    'href',
    '/zestawy/wampir',
  )
  await expect(page.getByRole('heading', { name: 'Teraz w warsztacie w Rabce' })).toBeVisible()
})

test('a medallion picks the lead creature of its tier, the switcher its sibling', async ({
  page,
}) => {
  await gotoHome(page)
  const tiers = page.getByRole('navigation', { name: 'Poziomy mocy' })
  await expect(tiers.getByRole('button')).toHaveCount(9)

  await tiers.getByRole('button', { name: /^Moc I / }).click()
  await expect(name(page)).toHaveText('Skrzat')
  await expect(tiers.getByRole('button', { name: /^Moc I / })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(card(page)).toContainText('jedyny na tym poziomie')

  await tiers.getByRole('button', { name: /^Moc VI / }).click()
  await expect(name(page)).toHaveText('Baba Jaga')
  const switcher = page.getByRole('group', { name: 'Komputery na tym poziomie mocy' })
  await switcher.getByRole('button', { name: /^Pani Zimy:/ }).click()
  await expect(name(page)).toHaveText('Pani Zimy')
  await expect(page.locator('.hero')).toHaveAttribute('data-material', 'lod')
  await expect(card(page).getByRole('link', { name: 'Poznaj Panią Zimy' })).toBeVisible()
})

test.describe('automatic switch', () => {
  test('every 7 s on desktop, stops for good after a pick', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop behaviour')
    await page.clock.install()
    await gotoHome(page)
    await expect(async () => {
      await page.clock.runFor(1000)
      await expect(name(page)).not.toHaveText('Wampir', { timeout: 100 })
    }).toPass({ timeout: 15_000 })
    await expect(name(page)).toHaveText('Weles')

    await page
      .getByRole('navigation', { name: 'Poziomy mocy' })
      .getByRole('button', { name: /^Moc II / })
      .click()
    await page.mouse.move(0, 0)
    await page.clock.runFor(30_000)
    await expect(name(page)).toHaveText('Licho')
  })

  test('never on a phone', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone behaviour')
    await page.clock.install()
    await gotoHome(page)
    await page.clock.runFor(30_000)
    await expect(name(page)).toHaveText('Wampir')
  })

  test('never with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.clock.install()
    await gotoHome(page)
    await page.clock.runFor(30_000)
    await expect(name(page)).toHaveText('Wampir')
  })
})

test('the page carries no cost or internal model', async ({ page, playwright, baseURL }) => {
  const internalModels = await panelInternalModels(playwright, baseURL)
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  expectNoHiddenOffer(await response!.text(), internalModels)
})
