import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

import { ADMIN_STATE, adminHeaders } from './helpers/adminSession'

/**
 * Price check (P7, panel spec §11, ADR-G007, board Raport) on the fake Claude (`PRICE_CHECK_FAKE=1`:
 * a link with `e2e-cena=N` reads N zł, `e2e-brak` reads „not available”). „Sprawdź ceny” → the
 * report → „Przyjmij propozycje” → the cost is saved and the price waits in „Do zatwierdzenia”.
 * Everything made here is removed at the end (db-writers).
 */

type Option = { id: number; code: string; type: string; cost: number; publicLabel: string }
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const FAKE = process.env.PRICE_CHECK_FAKE === '1'

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

test('anonymous visitor sees no reports, only a way to log in', async ({ page }) => {
  await page.goto('/admin/raporty-cen')
  await expect(page.getByRole('link', { name: 'Zaloguj się do panelu' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('USD')
})

test.describe('signed in as admin', () => {
  test.use({ storageState: ADMIN_STATE })

  test('the list of reports and the settings section pass axe', async ({ page, isMobile }) => {
    await page.goto('/admin/raporty-cen')
    await expect(page.getByRole('heading', { level: 1, name: 'Raporty cen' })).toBeVisible()
    if (isMobile) await noSidewaysScroll(page)
    const { violations } = await new AxeBuilder({ page })
      .include('[data-reports-screen]')
      .withTags(AXE_TAGS)
      .analyze()
    expect(violations).toEqual([])

    await page.goto('/admin/ustawienia')
    const section = page.getByRole('region', { name: 'Sprawdzanie cen' })
    await expect(section).toContainText('Wydano w tym miesiącu')
    await expect(section.getByLabel('Limit wydatków Claude na miesiąc (USD)')).toHaveValue(/\d/)
  })
})

test.describe('a price check on the fake Claude', () => {
  test.use({ storageState: ADMIN_STATE })
  test.skip(({ isMobile }) => isMobile, 'writes in the desktop project only')
  test.skip(!FAKE, 'needs PRICE_CHECK_FAKE=1 on the server')

  let api: APIRequestContext
  let headers: Record<string, string>
  let ram: Option
  let disk: Option
  let box: Option
  const created: number[] = []
  const startedChecks: number[] = []

  test.beforeAll(async ({ playwright, baseURL }) => {
    api = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    })
    headers = adminHeaders()
    const list = (await (
      await api.get('/api/options?limit=100&depth=0&sort=code', { headers })
    ).json()) as { docs: Option[] }
    ram = list.docs.find((o) => o.code === 'R32')!
    disk = list.docs.find((o) => o.type === 'ssd')!
    box = list.docs.find((o) => o.type === 'case')!
    const links = [
      // RAM 8% dearer on the market → a proposal.
      {
        code: ram.code,
        url: `https://www.x-kom.pl/p/e2e-r32?e2e-cena=${Math.round(ram.cost * 1.08)}`,
      },
      // A disk at twice the cost → to check by hand, no proposal.
      { code: disk.code, url: `https://www.x-kom.pl/p/e2e-ssd?e2e-cena=${disk.cost * 2}` },
      // A case out of stock → unavailable.
      { code: box.code, url: 'https://www.x-kom.pl/p/e2e-case?e2e-brak=1' },
    ]
    for (const l of links) {
      const res = await api.post('/api/price-sources', {
        headers,
        data: { itemType: 'option', itemCode: l.code, url: l.url, active: true },
      })
      expect(res.status(), await res.text()).toBe(201)
      created.push(((await res.json()) as { doc: { id: number } }).doc.id)
    }
  })

  test.afterAll(async () => {
    await api.patch(`/api/options/${ram.id}`, { headers, data: { cost: ram.cost } })
    for (const id of created) await api.delete(`/api/price-sources/${id}`, { headers })
    for (const id of startedChecks) await api.delete(`/api/price-checks/${id}`, { headers })
    await api.dispose()
  })

  test('„Sprawdź ceny” → report → „Przyjmij propozycje” → „Do zatwierdzenia”', async ({ page }) => {
    test.setTimeout(150_000)
    await page.goto('/admin/raporty-cen')
    await page.locator('.pn-top').getByRole('button', { name: 'Sprawdź ceny' }).click()
    await expect(page).toHaveURL(/\/admin\/raporty-cen\/\d+$/, { timeout: 20_000 })
    startedChecks.push(Number(page.url().split('/').pop()))

    // The run is in the background; the report page refreshes itself while it runs.
    await expect(page.getByText('Zakończone', { exact: true })).toBeVisible({ timeout: 120_000 })

    const changes = page.getByRole('region', { name: 'Zmiany cen części' })
    await changes.getByRole('button', { name: /^Do zatwierdzenia/ }).click()
    await expect(changes.locator('tbody tr')).toHaveCount(1)
    await expect(changes.locator('tbody tr').first()).toContainText(ram.publicLabel)
    await changes.getByRole('button', { name: /^Do sprawdzenia/ }).click()
    await expect(changes.locator('tbody tr').filter({ hasText: disk.publicLabel })).toHaveCount(1)
    await changes.getByRole('button', { name: /^Niedostępne/ }).click()
    await expect(changes.locator('tbody tr').filter({ hasText: box.publicLabel })).toHaveCount(1)

    await expect(page.getByRole('region', { name: 'Najważniejsze' })).toContainText(
      'Propozycje do zatwierdzenia: 1.',
    )
    await expect(
      page.getByRole('region', { name: 'Wpływ na zestawy' }).locator('tbody tr'),
    ).toHaveCount(16)

    await page.getByRole('button', { name: 'Przyjmij 1 propozycję' }).click()
    await expect(page.getByText('zapisano koszty: 1 opcji, 0 poziomów')).toBeVisible()
    // The page's own request (signed in as admin): the API context of `beforeAll` sat idle
    // during the run and its kept-alive socket may be closed by now (ECONNRESET in CI).
    const saved = (await (
      await page.request.get(`/api/options/${ram.id}?depth=0`)
    ).json()) as Option
    expect(saved.cost).toBe(Math.round(ram.cost * 1.08))

    await page.goto('/admin/ceny/zatwierdzanie')
    await expect(page.getByRole('checkbox', { name: `Publikuj: ${ram.publicLabel}` })).toBeVisible()

    const { violations } = await new AxeBuilder({ page })
      .include('[data-prices-screen]')
      .withTags(AXE_TAGS)
      .analyze()
    expect(violations).toEqual([])
  })
})
