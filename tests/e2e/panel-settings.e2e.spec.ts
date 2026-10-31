import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

import { ADMIN_STATE, adminHeaders } from './helpers/adminSession'

/**
 * /admin/ustawienia, section "Marża i narzuty" (P1, panel spec §13): the form shows the rules in
 * percent and złoty, rejects nonsense without saving anything and saves through Payload. Writes
 * `pricing-settings`, so it runs with the other database writers (playwright.config DB_WRITERS)
 * and puts the warning threshold back at the end.
 */

test.skip(({ isMobile }) => isMobile, 'saves in the desktop project only')
test.describe.configure({ mode: 'serial' })

let panel: APIRequestContext
let headers: Record<string, string>
const TEST_SIGNATURE = 'Krystian\nPRO-KOM Gaming (test)'
let mailBefore: { replyAlarmMinutes: number; signature: string } | null = null

async function stored(): Promise<{ minMargin: number; warnMargin: number }> {
  const response = await panel.get('/api/globals/pricing-settings', { headers })
  expect(response.status()).toBe(200)
  return (await response.json()) as { minMargin: number; warnMargin: number }
}

// The seed admin session of auth.setup.ts (no own login, see there).
test.use({ storageState: ADMIN_STATE })

test.beforeAll(async ({ playwright, baseURL }) => {
  panel = await playwright.request.newContext({ baseURL })
  headers = adminHeaders()
})

test.afterAll(async () => {
  await panel.post('/api/globals/pricing-settings', { headers, data: { warnMargin: 0.12 } })
  if (mailBefore) await panel.post('/api/globals/mail-settings', { headers, data: mailBefore })
  await panel.dispose()
})

test('the form shows the rules like the board and passes axe', async ({ page }) => {
  await page.goto('/admin/ustawienia')
  await expect(page.getByRole('heading', { level: 1, name: 'Ustawienia' })).toBeVisible()
  await expect(page.getByLabel('Minimalna marża komputera')).toHaveValue('11')
  await expect(page.getByLabel('Ostrzegaj, gdy zestaw ma mniej niż')).toHaveValue('12')
  await expect(page.getByLabel('Narzut poziomu 4K')).toHaveValue('14,5')
  await expect(page.getByLabel('Narzut RAM i dysków')).toHaveValue('15')
  await expect(page.getByLabel('Bufor obudów i chłodzeń')).toHaveValue('20')
  await expect(page.getByText('wyjątek: Skrzat 16,8%')).toBeVisible()
  await expect(page.getByText(/^na stronie: [\d\s ]+ zł$/)).toBeVisible()
  await expect(page.getByText('Publikacja zawsze ręczna')).toBeVisible()
  await expect(page.getByRole('link', { name: /Ustawienia/ }).first()).toHaveAttribute(
    'aria-current',
    'page',
  )
  const axe = await new AxeBuilder({ page })
    .include('[data-panel]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(axe.violations).toEqual([])
})

test('a warning below the minimum is refused and nothing is saved', async ({ page }) => {
  await page.goto('/admin/ustawienia')
  const warn = page.getByLabel('Ostrzegaj, gdy zestaw ma mniej niż')
  await warn.fill('10')
  await page.getByRole('button', { name: 'Zapisz zmiany' }).first().click()
  await expect(
    page.getByText('Próg ostrzeżenia nie może być niższy niż minimalna marża.'),
  ).toBeVisible()
  await expect(warn).toHaveAttribute('aria-invalid', 'true')
  // What was typed stays in the field to correct it.
  await expect(warn).toHaveValue('10')
  expect((await stored()).warnMargin).toBe(0.12)
})

test('a valid change is saved as a share and shown again after reload', async ({ page }) => {
  await page.goto('/admin/ustawienia')
  await page.getByLabel('Ostrzegaj, gdy zestaw ma mniej niż').fill('12,5')
  await page.getByRole('button', { name: 'Zapisz zmiany' }).first().click()
  await expect(page.getByRole('status').filter({ hasText: /^Zapisano/ })).toBeVisible()
  expect(await stored()).toMatchObject({ minMargin: 0.11, warnMargin: 0.125 })

  // A refused save right after a good one keeps what was typed (no remount of the fields).
  const warn = page.getByLabel('Ostrzegaj, gdy zestaw ma mniej niż')
  await warn.fill('10')
  await page.getByRole('button', { name: 'Zapisz zmiany' }).first().click()
  await expect(warn).toHaveAttribute('aria-invalid', 'true')
  await expect(warn).toHaveValue('10')
  await expect(warn).toBeFocused()

  await page.reload()
  await expect(page.getByLabel('Ostrzegaj, gdy zestaw ma mniej niż')).toHaveValue('12,5')
})

test('section „Zapytania i poczta” saves the alarm and the signature (P3)', async ({ page }) => {
  const before = await panel.get('/api/globals/mail-settings', { headers })
  expect(before.status()).toBe(200)
  const { replyAlarmMinutes, signature } = (await before.json()) as {
    replyAlarmMinutes: number
    signature: string
  }
  mailBefore = { replyAlarmMinutes, signature }

  await page.goto('/admin/ustawienia')
  const section = page.locator('form#pn-mail')
  await expect(page.getByRole('heading', { name: 'Zapytania i poczta' })).toBeVisible()

  // The end hour before the start is refused, nothing saved.
  await section.getByLabel('Odpowiadamy do godziny').fill('7')
  await section.getByRole('button', { name: 'Zapisz zmiany' }).click()
  await expect(section.getByLabel('Odpowiadamy do godziny')).toHaveAttribute('aria-invalid', 'true')

  await section.getByLabel('Odpowiadamy do godziny').fill('22')
  await section.getByLabel('Alarm: zapytanie bez odpowiedzi').fill('40')
  await section.getByLabel('Podpis').fill(TEST_SIGNATURE)
  await section.getByRole('button', { name: 'Zapisz zmiany' }).click()
  await expect(section.getByRole('status')).toHaveText('Zapisano.')

  const after = await panel.get('/api/globals/mail-settings', { headers })
  expect(await after.json()).toMatchObject({
    replyHours: { from: 8, to: 22 },
    replyAlarmMinutes: 40,
    signature: TEST_SIGNATURE,
  })
  expect(await new AxeBuilder({ page }).include('form#pn-mail').analyze()).toMatchObject({
    violations: [],
  })
})
