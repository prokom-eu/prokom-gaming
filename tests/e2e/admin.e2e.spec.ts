import { expect, test } from '@playwright/test'

// The seed admin (SEED_ADMIN_*, `pnpm seed`) logs in to the panel through the login form.
test('the seed admin logs in to the panel', async ({ page }) => {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set.')

  await page.goto('/admin/login')
  await page.locator('#field-email').fill(email)
  await page.locator('#field-password').fill(password)
  await page.locator('button[type="submit"]').click()

  await expect(page).toHaveURL(/\/admin\/?$/)
  await expect(page.locator('a[href="/admin/collections/users"]').first()).toBeVisible()
})
