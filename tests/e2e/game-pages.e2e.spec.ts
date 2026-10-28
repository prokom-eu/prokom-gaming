import { expect, test } from '@playwright/test'

import games from '../../seed/prokomgaming/games.json' with { type: 'json' }
import { expectNoHiddenOffer, panelInternalModels } from './helpers/hiddenOffer'

/**
 * „Komputer do {gry}” (G11, spec. §8, boards KomputerDo / KomputerDo-telefon): all 33 pages answer
 * with their own heading, title, canonical and structured data; an unknown game is 404; the
 * manufacturer's requirements stay hidden while empty; picks follow the resolution; no cost or
 * internal model in the page.
 */

const SEO_GAMES = games.items.filter((g) => g.seoPage)

test('all 33 game pages: heading, title, canonical, JSON-LD', async ({ request }) => {
  // 33 pages rendered per request (several seconds each under `next dev`).
  test.setTimeout(300_000)
  expect(SEO_GAMES).toHaveLength(33)
  for (const game of SEO_GAMES) {
    const response = await request.get(`/komputer-do/${game.slug}`)
    expect(response.status(), game.slug).toBe(200)
    const html = await response.text()
    expect(html).toContain(`Komputer do ${game.name.replace(/'/g, '&#x27;')}</h1>`)
    expect(html).toContain(
      `<title>Komputer do ${game.name.replace(/'/g, '&#x27;')}: ile klatek w FullHD, 2K i 4K | PRO-KOM Gaming</title>`,
    )
    expect(html).toMatch(new RegExp(`rel="canonical" href="[^"]*/komputer-do/${game.slug}"`))
    expect(html).toContain('"@type":"FAQPage"')
    expect(html).toContain('"@type":"BreadcrumbList"')
    // No requirements in the seed → no block (spec. §8).
    expect(html).not.toContain('Wymagania producenta')
  }
})

test('an unknown game is 404', async ({ request }) => {
  expect((await request.get('/komputer-do/nie-ma-takiej-gry')).status()).toBe(404)
})

test('Cyberpunk 2077: picks per monitor, tier table, FAQ, other games', async ({ page }) => {
  await page.goto('/komputer-do/cyberpunk-2077')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Komputer do Cyberpunk 2077')
  await expect(page.getByRole('heading', { name: 'Polecamy na monitor 2K' })).toBeVisible()
  const cards = page.locator('.gm-cards .hm-card')
  await expect(cards).toHaveCount(3)
  await expect(cards.locator('.nm')).toHaveText(['Licho', 'Strzyga', 'Bazyliszek'])
  await expect(cards.first()).toContainText('Cyberpunk 2077, 2K')
  for (const card of await cards.all()) await expect(card.locator('.src')).toHaveCount(1)

  await expect(page.locator('.gm-tier')).toHaveCount(9)

  await page.getByRole('radio', { name: 'FullHD' }).click()
  await expect(page.getByRole('heading', { name: 'Polecamy na monitor FullHD' })).toBeVisible()
  await expect(cards.first()).toContainText('Cyberpunk 2077, FullHD')

  const faq = page.locator('.gm-faq details')
  await expect(faq).toHaveCount(3)
  await expect(faq.first()).toHaveAttribute('open', '')
  await faq.nth(1).locator('summary').click()
  await expect(faq.nth(1)).toContainText('Taką pamięć mają nasze zestawy od Mocy')

  const others = page.getByRole('navigation', { name: 'Inne gry' }).getByRole('link')
  await expect(others).toHaveCount(12)
  await expect(others.first()).toHaveText('Komputer do Counter-Strike 2')
  await others.first().click()
  await expect(page).toHaveURL(/\/komputer-do\/counter-strike-2$/)
})

test('the page does not scroll sideways', async ({ page }) => {
  await page.goto('/komputer-do/cyberpunk-2077')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
})

test('the page carries no cost or internal model', async ({ page, playwright, baseURL }) => {
  const internalModels = await panelInternalModels(playwright, baseURL)
  const response = await page.goto('/komputer-do/cyberpunk-2077')
  expect(response?.status()).toBe(200)
  expectNoHiddenOffer(await response!.text(), internalModels)
})
