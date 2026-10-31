import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { expect, test as setup } from '@playwright/test'

import { ADMIN_STATE, ADMIN_TOKEN } from './helpers/adminSession'

/**
 * One login of the seed admin for the whole run, before every other test (project `auth`).
 * Payload 3.91 keeps sessions in an array on the user and every login rewrites the whole array
 * (`addSessionToUser`: read, push, update). Logins of the same account on parallel workers then
 * drop each other's session and a valid-looking token answers 401/403. Tests of the panel reuse
 * this session instead of logging in again; it is created before anything else runs, so later
 * logins (which copy the array) keep it.
 */
setup('log in the seed admin once', async ({ page }) => {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set.')
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(email)
  await page.locator('#field-password').fill(password)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/admin\/?$/)

  await mkdir(path.dirname(ADMIN_STATE), { recursive: true })
  await page.context().storageState({ path: ADMIN_STATE })
  const token = (await page.context().cookies()).find((c) => c.name === 'payload-token')?.value
  if (!token) throw new Error('No payload-token cookie after login.')
  await writeFile(ADMIN_TOKEN, token, 'utf8')
})
