import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { ADMIN_STATE } from './helpers/adminSession'

/**
 * The panel search (P8, panel spec §2, §2a pt 2): a field in the top bar on a computer, a
 * full-screen search from the magnifier on a phone. The text goes by POST (server action), never
 * into the address. Reads only (the seed's builds).
 */

test.use({ storageState: ADMIN_STATE })

test('computer: finds a build and opens its editor; the address stays clean', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the phone has its own search screen')
  await page.goto('/admin/statystyki')
  const field = page.getByRole('search').getByRole('searchbox', { name: 'Szukaj w panelu' })
  await field.fill('Bazyl')
  const hit = page.getByRole('link', { name: 'Bazyliszek' })
  await expect(hit).toBeVisible({ timeout: 15_000 })
  expect(page.url()).not.toContain('Bazyl')
  const result = await new AxeBuilder({ page }).include('.pn-search').analyze()
  expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  // Esc closes the results; typing opens them again.
  await field.press('Escape')
  await expect(hit).toBeHidden()
  await field.fill('Bazyli')
  await expect(hit).toBeVisible({ timeout: 15_000 })
  // Arrow down moves from the field into the results.
  await field.press('ArrowDown')
  await expect(page.locator('.pn-search__pop a').first()).toBeFocused()
  await hit.click()
  await expect(page).toHaveURL(/\/admin\/zestawy\/bazyliszek$/)
})

test('phone: the magnifier opens a full-screen search', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone only')
  await page.goto('/admin')
  await page.getByRole('button', { name: 'Szukaj w panelu' }).click()
  const dialog = page.getByRole('dialog', { name: 'Szukaj w panelu' })
  await expect(dialog).toBeVisible()
  const field = dialog.getByRole('searchbox', { name: 'Szukaj w panelu' })
  await expect(field).toBeFocused()
  await field.fill('Wampir')
  await expect(dialog.getByRole('link', { name: 'Wampir', exact: true })).toBeVisible({
    timeout: 15_000,
  })
  expect(page.url()).not.toContain('Wampir')
  await dialog.getByRole('button', { name: 'Anuluj' }).click()
  await expect(dialog).toBeHidden()
})
