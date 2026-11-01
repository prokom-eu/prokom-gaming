import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

import { ADMIN_STATE, adminHeaders } from './helpers/adminSession'

/**
 * „Opcje konfiguratora” (P6-3, panel spec §10, board Opcje) at 1440 and 414: tabs, an option of a
 * build cannot be switched off or deleted, „Dodaj RAM” with the live price creates a switched-off
 * option waiting in „Do zatwierdzenia”, deleting it removes its offer links too. The test option
 * is removed at the end whatever happens (db-writers).
 */

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const NAME = 'E2E RAM 16 GB DDR4 test'

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

test('anonymous visitor sees no options, only a way to log in', async ({ page }) => {
  await page.goto('/admin/opcje')
  await expect(page.getByRole('link', { name: 'Zaloguj się do panelu' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('zł')
})

test.describe('signed in as admin', () => {
  test.use({ storageState: ADMIN_STATE })

  test('tabs, the table, an option of a build stays on', async ({ page, isMobile }) => {
    await page.goto('/admin/opcje')
    await expect(page.getByRole('heading', { level: 1, name: 'Opcje konfiguratora' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Obudowy 24' })).toBeChecked()
    const rows = page.locator('[data-options-screen] tbody tr')
    await expect(rows).toHaveCount(24)

    // A case used in a build: delete is off with the builds as a hint.
    const used = rows.filter({ hasNotText: 'tylko w konfiguratorze' }).first()
    await expect(used.getByRole('button', { name: /^Usuń:/ })).toBeDisabled()
    await expect(used.getByRole('button', { name: /^Usuń:/ })).toHaveAttribute(
      'title',
      /^Używana w: /,
    )

    await page.getByRole('radio', { name: /^Poziomy mocy/ }).click()
    await expect(rows).toHaveCount(16)
    await expect(rows.first()).toContainText('części z ofertą')
    await expect(page.getByRole('switch')).toHaveCount(0)

    if (isMobile) await noSidewaysScroll(page)
    const { violations } = await new AxeBuilder({ page })
      .include('[data-options-screen]')
      .withTags(AXE_TAGS)
      .analyze()
    expect(violations).toEqual([])
  })
})

test.describe('changes', () => {
  test.use({ storageState: ADMIN_STATE })
  test.skip(({ isMobile }) => isMobile, 'writes in the desktop project only')

  let panel: APIRequestContext
  let headers: Record<string, string>

  test.beforeAll(async ({ playwright, baseURL }) => {
    panel = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    })
    headers = adminHeaders()
  })

  test.afterAll(async () => {
    // The test option and its links go, whatever happened above.
    const found = (await (
      await panel.get(
        `/api/options?where[publicLabel][equals]=${encodeURIComponent(NAME)}&depth=0`,
        {
          headers,
        },
      )
    ).json()) as { docs: { id: number; code: string }[] }
    for (const o of found.docs) {
      await panel.delete(`/api/price-sources?where[itemCode][equals]=${o.code}`, { headers })
      await panel.delete(`/api/options/${o.id}`, { headers })
    }
    await panel.dispose()
  })

  test('switching off an option of a build is refused with the build', async ({ page }) => {
    await page.goto('/admin/opcje')
    const used = page
      .locator('[data-options-screen] tbody tr')
      .filter({ hasNotText: 'tylko w konfiguratorze' })
      .first()
    await used.getByRole('switch').click()
    await expect(page.getByText(/Opcja jest w zestawie: /)).toBeVisible()
    await expect(used.getByRole('switch')).toBeChecked()
  })

  test('„Dodaj RAM”: live price, a bad link refused, then waiting for approval; delete cleans links', async ({
    page,
  }) => {
    await page.goto('/admin/opcje')
    await page.getByRole('radio', { name: /^RAM/ }).click()
    await page.getByRole('button', { name: 'Dodaj RAM' }).click()
    const panelForm = page.getByRole('region', { name: 'Nowy RAM' })
    await panelForm.getByLabel('Nazwa na stronie (z producentem)').fill(NAME)
    await panelForm.getByLabel('Model wewnętrzny (do zamówień)').fill('E2E Test DDR4 16GB')
    await panelForm.getByLabel('Typ pamięci').selectOption('DDR4')
    await panelForm.getByLabel('Pojemność (GB)').fill('16')
    await panelForm.getByLabel('Koszt zakupu (zł)').fill('500')
    await expect(panelForm.getByText(/^Cena na stronie: \d[\d\s ]* zł$/)).toBeVisible()
    await expect(panelForm).toContainText(/względem najtańszej tego rodzaju/)

    // A marketplace link is refused, nothing is created.
    await panelForm.getByLabel(/Linki do ofert/).fill('https://allegro.pl/oferta/1')
    await panelForm.getByRole('button', { name: 'Dodaj do zatwierdzenia' }).click()
    await expect(panelForm.getByText(/Link spoza dozwolonych sklepów/)).toBeVisible()
    // The form keeps what was typed after a refused save.
    await expect(panelForm.getByLabel(/Linki do ofert/)).toHaveValue('https://allegro.pl/oferta/1')

    await panelForm.getByLabel(/Linki do ofert/).fill('https://www.x-kom.pl/p/123-e2e-ram.html')
    await panelForm.getByRole('button', { name: 'Dodaj do zatwierdzenia' }).click()
    await expect(page.getByText(`Dodano: ${NAME}`)).toBeVisible()

    const row = page.locator('[data-options-screen] tbody tr').filter({ hasText: NAME })
    await expect(row).toContainText('nowa')
    await expect(row).toContainText('1 źródło')
    await expect(row.getByRole('switch')).not.toBeChecked()

    await page.goto('/admin/ceny/zatwierdzanie')
    await expect(
      page.getByRole('checkbox', { name: new RegExp(`Publikuj: ${NAME}`) }),
    ).toBeChecked()

    await page.goto('/admin/opcje')
    await page.getByRole('radio', { name: /^RAM/ }).click()
    await page
      .locator('[data-options-screen] tbody tr')
      .filter({ hasText: NAME })
      .getByRole('button', { name: /^Usuń:/ })
      .click()
    await page
      .getByRole('dialog', { name: 'Usuń opcję' })
      .getByRole('button', { name: 'Usuń' })
      .click()
    await expect(page.getByText(`Usunięto: ${NAME}`)).toBeVisible()
    const left = (await (
      await panel.get('/api/price-sources?where[url][contains]=e2e-ram&depth=0', { headers })
    ).json()) as { docs: unknown[] }
    expect(left.docs).toHaveLength(0)
  })
})
