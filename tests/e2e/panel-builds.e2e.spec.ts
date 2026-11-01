import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

import { ADMIN_STATE, adminHeaders } from './helpers/adminSession'

/**
 * Builds in the panel (P6-2, panel spec §9, boards Zestawy and Zestaw, stany/tel-06): the list,
 * the editor with live price and greyed-out parts, saving with the price confirmation, and the
 * status — a hidden build does not exist for the site. Writes are undone at the end (db-writers).
 */

type Build = { id: number; slug: string; case: number; offerStatus: string }
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

test('anonymous visitor sees no builds screen, only a way to log in', async ({ page }) => {
  await page.goto('/admin/zestawy')
  await expect(page.getByRole('link', { name: 'Zaloguj się do panelu' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('zł')
  // A view with a path parameter: Payload itself sends the visitor to its login form.
  await page.goto('/admin/zestawy/bazyliszek')
  await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('zł')
})

test.describe('signed in as admin', () => {
  test.use({ storageState: ADMIN_STATE })

  test('the list: 16 cards, monitor filter, sorting, editor links', async ({ page, isMobile }) => {
    await page.goto('/admin/zestawy')
    await expect(page.getByRole('heading', { level: 1, name: 'Gotowe zestawy' })).toBeVisible()
    const cards = page.locator('[data-builds-screen] li.pn-card')
    await expect(cards).toHaveCount(16)
    await expect(cards.filter({ hasText: 'Bazyliszek' })).toContainText('11 930 zł')

    await page.getByRole('radio', { name: '4K' }).click()
    expect(await cards.count()).toBeLessThan(16)
    await page.getByRole('radio', { name: /^Wszystkie/ }).click()
    await page.getByRole('radio', { name: 'Nazwa' }).click()
    await expect(cards.first().getByRole('heading')).toHaveText('Baba Jaga')
    await expect(page.getByRole('link', { name: 'Edytuj: Bazyliszek' })).toHaveAttribute(
      'href',
      '/admin/zestawy/bazyliszek',
    )
    if (isMobile) await noSidewaysScroll(page)
    const { violations } = await new AxeBuilder({ page })
      .include('[data-builds-screen]')
      .withTags(AXE_TAGS)
      .analyze()
    expect(violations).toEqual([])
  })

  test('the editor: Bazyliszek at 11 930 zł, greyed-out parts, live price', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/admin/zestawy/bazyliszek')
    await expect(page.getByRole('heading', { level: 1, name: 'Bazyliszek' })).toBeVisible()
    const card = page.getByRole('region', { name: 'Cena zestawu' })
    await expect(card.locator('p').first()).toContainText('11 930 zł')
    await expect(card.getByText('przepis: Bazyliszek')).toBeVisible()

    // Parts that do not fit the level are greyed out with the reason (lib/compat).
    const cases = page.getByRole('radiogroup', { name: 'Obudowa' })
    await expect(cases.locator('[aria-disabled="true"]').first()).toBeVisible()
    // Another fitting case: the price changes live, the action bar shows the card's number.
    await cases.locator('[role="radio"][aria-checked="false"]:not([aria-disabled])').first().click()
    await expect(card.locator('p').first()).not.toContainText('11 930 zł')
    const price = (await card.locator('p b').first().textContent())!
    await expect(page.locator('.pn-mact__v b')).toHaveText(price)

    if (isMobile) await noSidewaysScroll(page)
    const { violations } = await new AxeBuilder({ page })
      .include('[data-builds-screen]')
      .withTags(AXE_TAGS)
      .analyze()
    expect(violations).toEqual([])
  })

  test('an unknown build answers „Nie ma takiego zestawu”', async ({ page }) => {
    await page.goto('/admin/zestawy/nie-ma-takiego')
    await expect(page.getByText('Nie ma takiego zestawu')).toBeVisible()
  })
})

test.describe('saving', () => {
  test.use({ storageState: ADMIN_STATE })
  test.skip(({ isMobile }) => isMobile, 'writes in the desktop project only')

  let panel: APIRequestContext
  let anon: APIRequestContext
  let headers: Record<string, string>
  let original: Build

  test.beforeAll(async ({ playwright, baseURL }) => {
    panel = await playwright.request.newContext({ baseURL })
    // `storageState` signs in the `request` fixture too: the site is checked from its own context.
    anon = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    })
    headers = adminHeaders()
    const list = (await (
      await panel.get('/api/builds?where[slug][equals]=bazyliszek&depth=0', { headers })
    ).json()) as { docs: Build[] }
    original = list.docs[0]!
  })

  test.afterAll(async () => {
    await panel.patch(`/api/builds/${original.id}`, {
      headers,
      data: { case: original.case, offerStatus: 'published' },
    })
    await panel.dispose()
    await anon.dispose()
  })

  test('a new price on the site needs the confirmation; a hidden build is gone from the site', async ({
    page,
  }) => {
    await page.goto('/admin/zestawy/bazyliszek')
    const cases = page.getByRole('radiogroup', { name: 'Obudowa' })
    await cases.locator('[role="radio"][aria-checked="false"]:not([aria-disabled])').first().click()
    const price = (await page
      .getByRole('region', { name: 'Cena zestawu' })
      .locator('p b')
      .first()
      .textContent())!
    await page
      .getByRole('region', { name: 'Cena zestawu' })
      .getByRole('button', { name: 'Zapisz' })
      .click()

    const sheet = page.getByRole('dialog', { name: 'Potwierdź cenę' })
    await expect(sheet).toContainText('11 930 zł')
    await expect(sheet).toContainText(price)
    await sheet.getByRole('button', { name: /^Zapisz z ceną/ }).click()
    await expect(
      page.getByRole('region', { name: 'Cena zestawu' }).getByText('Zapisano zestaw.'),
    ).toBeVisible()
    // The build page shows the saved price (the same sum; digits compared without spacing).
    const buildPage = await (await anon.get('/zestawy/bazyliszek')).text()
    expect(buildPage.replace(/\s/g, '')).toContain(`${price.replace(/\D/g, '')}zł`)

    // Hidden: saved at once (it leaves the site), then the site and its API do not know it.
    await page.getByRole('radio', { name: 'Ukryty' }).click()
    await expect(
      page.getByRole('region', { name: 'Cena zestawu' }).getByText('Zapisano zestaw.'),
    ).toBeHidden()
    await page
      .getByRole('region', { name: 'Cena zestawu' })
      .getByRole('button', { name: 'Zapisz' })
      .click()
    await expect(
      page.getByRole('region', { name: 'Cena zestawu' }).getByText('Zapisano zestaw.'),
    ).toBeVisible()
    expect((await anon.get('/zestawy/bazyliszek')).status()).toBe(404)
    const api = (await (
      await anon.get('/api/builds?where[slug][equals]=bazyliszek&depth=0')
    ).json()) as { docs: unknown[] }
    expect(api.docs).toHaveLength(0)
    // No card on /zestawy. The static shell menu (`lib/site.ts`, STAN) still links all 16
    // creatures, so a hidden build has one link fewer than a published one (card + menu).
    const list = await (await anon.get('/zestawy')).text()
    const links = (slug: string) => list.split(`href="/zestawy/${slug}"`).length - 1
    expect(links('bazyliszek')).toBe(links('wampir') - 1)
  })
})
