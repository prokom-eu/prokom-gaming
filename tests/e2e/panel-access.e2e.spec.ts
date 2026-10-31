import { randomBytes } from 'node:crypto'

import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

/**
 * Access to the custom panel views (panel spec §15, ADR-G006 §3): custom Payload views are public
 * by definition, so every one checks access itself (`panelAccess`). Not signed in → a way to the
 * login and nothing of the screen; `serwis` → "403" on admin screens, the workshop navigation and
 * no inquiries, prices or settings. The `serwis` account is created here and removed at the end.
 */

test.describe.configure({ mode: 'serial' })

// The dev-only preview answers 404 in production builds (CI runs `next start`).
const SCREENS = [
  '/admin/ceny',
  '/admin/dane',
  ...(process.env.E2E_SERVER === 'start' ? [] : ['/admin/podglad-panelu']),
]

test('not signed in: every panel screen offers the login and shows nothing else', async ({
  page,
}) => {
  for (const path of SCREENS) {
    await page.goto(path)
    const login = page.getByRole('link', { name: 'Zaloguj się do panelu' })
    await expect(login, path).toBeVisible()
    await expect(login).toHaveAttribute('href', `/admin/login?redirect=${encodeURIComponent(path)}`)
    await expect(page.getByRole('navigation', { name: 'Codziennie' })).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('zł')
  }
})

test.describe('signed in with the serwis role', () => {
  test.skip(({ isMobile }) => isMobile, 'one project is enough for the role check')

  const run = randomBytes(4).toString('hex')
  const email = `p1-serwis-${run}@example.test`
  const password = randomBytes(12).toString('hex')
  let admin: APIRequestContext
  let headers: Record<string, string>
  let userId: number

  test.beforeAll(async ({ playwright, baseURL }) => {
    admin = await playwright.request.newContext({ baseURL })
    const login = await admin.post('/api/users/login', {
      data: { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD },
    })
    expect(login.status()).toBe(200)
    headers = { Authorization: `JWT ${((await login.json()) as { token: string }).token}` }
    const created = await admin.post('/api/users', {
      headers,
      data: { email, password, role: 'serwis' },
    })
    expect(created.status(), await created.text()).toBe(201)
    userId = ((await created.json()) as { doc: { id: number } }).doc.id
  })

  test.afterAll(async () => {
    if (userId) await admin.delete(`/api/users/${userId}`, { headers })
    await admin.dispose()
  })

  async function logInAsSerwis(page: Page) {
    await page.goto('/admin/login')
    await page.locator('#field-email').fill(email)
    await page.locator('#field-password').fill(password)
    await page.locator('button[type="submit"]').click()
    await expect(page).toHaveURL(/\/admin\/?$/)
  }

  test('admin screens answer "403" inside the workshop frame', async ({ page }) => {
    await logInAsSerwis(page)
    await page.goto('/admin/ceny')
    await expect(page.getByRole('heading', { level: 1, name: 'Brak dostępu (403)' })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('zł')
    const workshop = page.getByRole('navigation', { name: 'Warsztat' })
    await expect(workshop.getByRole('link', { name: /Warsztat/ })).toBeVisible()
    await expect(workshop.getByRole('link', { name: /Zgłoszenia/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Zapytania/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Do zatwierdzenia/ })).toHaveCount(0)
  })

  test('staff screens open for serwis', async ({ page }) => {
    await logInAsSerwis(page)
    await page.goto('/admin/dane')
    await expect(page.getByRole('heading', { level: 1, name: 'Dane (listy)' })).toBeVisible()
    // Payload's own access hides admin-only collections from the list.
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Zapytania', exact: true }),
    ).toHaveCount(0)
  })
})
