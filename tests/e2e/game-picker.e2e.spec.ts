import { expect, test } from '@playwright/test'

import { expectNoHiddenOffer, panelInternalModels } from './helpers/hiddenOffer'

/**
 * „Dobór pod grę” (G11, spec. §8, boards Gra / Gra-telefon, `stany/tel-09`, `tel-10`): the game and
 * resolution from the address, three recommendations by the spec rule, nine tiers with „płynnie /
 * poniżej 60” and a source at every number, switching without a request, the address following,
 * the manufacturer's requirements hidden while empty, no cost or internal model in the page.
 */

test('Cyberpunk 2077 in 2K: three picks in board order and nine tiers', async ({ page }) => {
  await page.goto('/dobor-pod-gre')
  await expect(page).toHaveURL(/\?gra=cyberpunk-2077&rozdz=2k$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Komputer do Cyberpunk 2077')

  const picks = page.locator('.gm-pick')
  await expect(picks).toHaveCount(3)
  await expect(picks.locator('.gm-pick__tag')).toHaveText([
    'Najtaniej płynnie',
    'Złoty środek',
    'Z zapasem',
  ])
  // Spec. §8 on the seed data = the board KomputerDo's picks for 2K.
  await expect(picks.locator('.nm')).toHaveText(['Licho', 'Strzyga', 'Bazyliszek'])
  for (const pick of await picks.all()) await expect(pick.locator('.src')).toHaveCount(1)

  const tiers = page.locator('.gm-tier')
  await expect(tiers).toHaveCount(9)
  await expect(tiers.first()).toContainText('poniżej 60')
  await expect(tiers.nth(1)).toContainText('płynnie')
  for (const tier of await tiers.all()) await expect(tier.locator('.src')).toHaveCount(1)

  // Requirements are empty in the seed: the block is not rendered (spec. §8).
  await expect(page.getByRole('heading', { name: 'Wymagania producenta' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Skąd są liczby' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Co znaczą kolory' })).toBeVisible()
})

test('a game and a resolution from the address; switching follows in the address', async ({
  page,
}) => {
  await page.goto('/dobor-pod-gre?gra=counter-strike-2&rozdz=fullhd')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Komputer do Counter-Strike 2')
  await expect(page.getByRole('radio', { name: 'FullHD' })).toHaveAttribute('aria-checked', 'true')

  await page.getByRole('button', { name: 'Elden Ring', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Komputer do Elden Ring')
  await expect(page).toHaveURL(/\?gra=elden-ring&rozdz=fullhd$/)
  // Capped game: one card, the cap instead of a number above it.
  await expect(page.locator('.gm-pick')).toHaveCount(1)
  await expect(page.locator('.gm-pick__fps')).toHaveText('60 FPS, limit gry')

  await page.getByRole('radio', { name: '4K' }).click()
  await expect(page).toHaveURL(/rozdz=4k$/)
  await expect(page.locator('.gm-tiers__title')).toHaveText('Wszystkie poziomy mocy w 4K')
})

test('unknown values in the address fall back to the default view', async ({ page }) => {
  await page.goto('/dobor-pod-gre?gra=nie-ma&rozdz=8k')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Komputer do Cyberpunk 2077')
  await expect(page).toHaveURL(/\?gra=cyberpunk-2077&rozdz=2k$/)
})

test('a pick leads to its build page', async ({ page }) => {
  await page.goto('/dobor-pod-gre')
  await page.locator('.gm-pick').first().click()
  await expect(page).toHaveURL(/\/zestawy\/licho$/)
})

test('the page does not scroll sideways', async ({ page }) => {
  await page.goto('/dobor-pod-gre')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
})

test('the page carries no cost or internal model', async ({ page, playwright, baseURL }) => {
  const internalModels = await panelInternalModels(playwright, baseURL)
  const response = await page.goto('/dobor-pod-gre')
  expect(response?.status()).toBe(200)
  expectNoHiddenOffer(await response!.text(), internalModels)
})
