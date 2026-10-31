import { randomBytes } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

import { ADMIN_STATE, adminHeaders } from './helpers/adminSession'

/**
 * Pulpit „Dziś” (P2, panel spec §3, board Main, stany/tel-01-pulpit) at 1440 and 414: the
 * sections, the margin switch, the cards on a phone, axe, no sideways scrolling; `serwis` sees the
 * workshop only; not signed in → the login. Read-only for the admin (other tests change costs and
 * inquiries in parallel, so numbers are checked by the unit tests of `src/admin/dashboard`).
 */

const main = (page: Page) => page.locator('#pn-tresc')

test.describe('signed in as admin', () => {
  test.use({ storageState: ADMIN_STATE })

  test('the Pulpit replaces the dashboard: tiles, to-do, margins, side cards', async ({
    page,
  }, testInfo) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { level: 1, name: 'Dziś' })).toBeVisible()
    await expect(page.getByText('zapytania, warsztat, ceny i ruch w jednym miejscu.')).toBeVisible()

    for (const label of [
      'Zapytania dziś',
      'Średnia marża gotowców',
      'Najniższa marża w konfiguratorze',
    ]) {
      await expect(main(page).getByText(label, { exact: true })).toBeVisible()
    }
    // Without Umami (P8) the visitors tile is gone, not empty.
    await expect(main(page).getByText('Odwiedzający dziś')).toHaveCount(0)

    await expect(page.getByRole('heading', { name: 'Czeka na Ciebie' })).toBeVisible()
    for (const title of [
      'Ostatnie zapytania',
      'Warsztat',
      'Ceny na rynku',
      'Ruch na stronie',
      'Ostatnie zdarzenia',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: title, exact: true })).toBeVisible()
    }

    const table = page.getByRole('table', { name: /Marża gotowych zestawów/ })
    await expect(table.locator('tbody tr')).toHaveCount(16)
    await expect(table.getByRole('rowheader', { name: /Bazyliszek/ })).toBeVisible()

    await page.screenshot({ path: testInfo.outputPath('pulpit.png'), fullPage: true })
  })

  test('the margin switch shows the publication and today’s costs', async ({ page }) => {
    await page.goto('/admin')
    const switcher = page.getByRole('radiogroup', { name: 'Ceny i koszty' })
    await expect(switcher.getByRole('radio', { name: 'Dzisiejsze koszty' })).toBeChecked()
    await expect(
      page.getByText('Te same ceny na stronie, dzisiejsze koszty. Tak jest teraz.'),
    ).toBeVisible()

    await switcher.getByRole('radio', { name: /^Ceny \d{2}\.\d{2}$/ }).click()
    await expect(
      page.getByText(/^Marża przy cenach i kosztach z publikacji \d{2}\.\d{2}\.\d{4}\.$/),
    ).toBeVisible()
    await expect(
      page.getByRole('table', { name: /Marża gotowych zestawów: Ceny \d{2}\.\d{2}/ }),
    ).toBeVisible()
  })

  test('links lead to the places where the work gets done', async ({ page }) => {
    await page.goto('/admin')
    const recent = page.getByRole('region', { name: 'Ostatnie zapytania' })
    await expect(recent.getByRole('link', { name: 'Wszystkie' })).toHaveAttribute(
      'href',
      '/admin/zapytania',
    )
    for (const link of await recent.locator('a.pn-recent').all()) {
      await expect(link).toHaveAttribute('href', /^\/admin\/zapytania\?nr=PKG-\d{4}-\d{4}$/)
    }
  })

  test('axe passes and nothing scrolls sideways', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { level: 1, name: 'Dziś' })).toBeVisible()
    const axe = await new AxeBuilder({ page })
      .include('[data-panel]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(axe.violations).toEqual([])
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('phone: tiles two in a row, builds as cards', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone mode only')
    await page.goto('/admin')
    const tiles = main(page).locator('.pn-dash__kpis > *')
    const [a, b] = await Promise.all([tiles.nth(0).boundingBox(), tiles.nth(1).boundingBox()])
    expect(a && b && Math.abs(a.y - b.y) < 2 && b.x > a.x).toBe(true)
    // DataTable on a phone: no header row, every row a card with labelled values.
    await expect(
      page.getByRole('table', { name: /Marża gotowych zestawów/ }).locator('thead'),
    ).toBeHidden()
    await expect(page.locator('td[data-label="Cena"]').first()).toBeVisible()
  })
})

test('not signed in: the Pulpit sends to the login', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.locator('body')).not.toContainText('Marża')
})

test.describe('signed in with the serwis role', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(({ isMobile }) => isMobile, 'one project is enough for the role check')

  const run = randomBytes(4).toString('hex')
  const email = `p2-serwis-${run}@example.test`
  const password = randomBytes(12).toString('hex')
  let admin: APIRequestContext
  let userId: number

  test.beforeAll(async ({ playwright, baseURL }) => {
    admin = await playwright.request.newContext({ baseURL })
    const created = await admin.post('/api/users', {
      headers: adminHeaders(),
      data: { email, password, role: 'serwis' },
    })
    expect(created.status(), await created.text()).toBe(201)
    userId = ((await created.json()) as { doc: { id: number } }).doc.id
  })

  test.afterAll(async () => {
    if (userId) await admin.delete(`/api/users/${userId}`, { headers: adminHeaders() })
    await admin.dispose()
  })

  test('sees the workshop only — no inquiries, prices or margins', async ({ page }) => {
    await page.goto('/admin/login')
    await page.locator('#field-email').fill(email)
    await page.locator('#field-password').fill(password)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/admin\/?$/)

    await expect(page.getByRole('heading', { level: 1, name: 'Dziś' })).toBeVisible()
    await expect(main(page).getByRole('heading', { level: 2, name: 'Warsztat' })).toBeVisible()
    const content = main(page)
    for (const text of ['Marża', 'Czeka na Ciebie', 'Ostatnie zapytania', 'zł', '%']) {
      await expect(content, text).not.toContainText(text)
    }
    // The whole page and its RSC data too (shell, hidden Payload nav), not just the content.
    expect(await page.content()).not.toMatch(/Marża|marż|Czeka na Ciebie|PKG-\d{4}/)
  })
})
