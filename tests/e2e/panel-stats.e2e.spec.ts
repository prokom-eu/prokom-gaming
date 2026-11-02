import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { ADMIN_STATE } from './helpers/adminSession'

/**
 * /admin/statystyki (P8, panel spec §12, board Statystyki, stany/tel-10): the period in the
 * address, tiles, the chart, the funnel, sources, builds, games and devices. CI runs the fake
 * Umami (`UMAMI_FAKE=1`, fixed numbers) — the traffic checks need it; the state without Umami is
 * covered by the unit tests of the reader. Reads only.
 */

test.use({ storageState: ADMIN_STATE })

const fake = process.env.UMAMI_FAKE === '1'

test('the screen: period switch, tiles, chart and funnel', async ({ page }) => {
  await page.goto('/admin/statystyki')
  await expect(page.getByRole('heading', { level: 1, name: 'Statystyki strony' })).toBeVisible()
  const period = page.getByRole('navigation', { name: 'Okres' })
  await expect(period.getByRole('link', { name: 'Ostatnie 30 dni' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await period.getByRole('link', { name: 'Ostatnie 7 dni' }).click()
  await expect(page).toHaveURL(/\/admin\/statystyki\?okres=7$/)
  await expect(period.getByRole('link', { name: 'Ostatnie 7 dni' })).toHaveAttribute(
    'aria-current',
    'page',
  )

  const main = page.getByRole('main')
  await expect(main.getByText('Przychód z zamówień')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Ruch i zapytania' })).toBeVisible()
  // The chart's numbers are in a table for screen readers: one row per day of the period.
  await expect(page.locator('figure table tbody tr')).toHaveCount(7)
  const funnel = page.getByRole('region', { name: 'Lejek sprzedaży' })
  await expect(funnel.getByText('Wysłali zapytanie')).toBeVisible()
  await expect(funnel.getByText('Zamówili')).toBeVisible()

  if (fake) {
    // The visitors tile (the same number heads the funnel).
    await expect(main.locator('.pn-kpi', { hasText: 'Odwiedzający' })).toContainText('1 234')
    await expect(funnel.getByText('Obejrzeli zestaw albo konfigurator')).toBeVisible()
    const sources = page.getByRole('region', { name: 'Skąd przychodzą' })
    await expect(sources.getByText('Google (wyszukiwarka)')).toBeVisible()
    await expect(sources.getByText('Wejścia bezpośrednie')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Gry wybierane w doborze' })).toContainText(
      'Fortnite',
    )
    await expect(page.getByRole('region', { name: 'Urządzenia i strony wejścia' })).toContainText(
      '/ (strona główna)',
    )
  }
})

test('no horizontal scroll and no axe errors', async ({ page }) => {
  await page.goto('/admin/statystyki')
  await expect(page.getByRole('heading', { level: 1, name: 'Statystyki strony' })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
  const result = await new AxeBuilder({ page }).analyze()
  expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
})

test('the Pulpit shows the traffic of the fake Umami', async ({ page }) => {
  test.skip(!fake, 'exact traffic numbers need UMAMI_FAKE=1 (CI)')
  await page.goto('/admin')
  const card = page.getByRole('region', { name: 'Ruch na stronie' })
  await expect(card).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Odwiedzający dziś')).toBeVisible()
  await expect(card).toContainText('1 234')
})
