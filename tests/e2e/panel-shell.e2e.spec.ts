import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Panel shell (P1, panel spec §2, §2a): sidebar on a computer; app bar, bottom tabs and the
 * "Więcej" sheet on a phone; the table as cards; no sideways scrolling; axe; the PWA manifest
 * only for /admin. Read-only — runs at 1440 and 414 with the seed admin.
 */

async function logIn(page: Page): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set.')
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(email)
  await page.locator('#field-password').fill(password)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/admin\/?$/)
}

const tabbar = (page: Page) => page.getByRole('navigation', { name: 'Panel, nawigacja dolna' })

test.describe('signed in as admin', () => {
  test.beforeEach(async ({ page }) => {
    await logIn(page)
  })

  test('the shell of the mode on a real screen', async ({ page, isMobile }) => {
    await page.goto('/admin/dane')
    await expect(page.getByRole('heading', { level: 1, name: 'Dane (listy)' })).toBeVisible()
    if (isMobile) {
      await expect(tabbar(page).getByRole('link', { name: /Pulpit/ })).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Codziennie' })).toBeHidden()
    } else {
      const daily = page.getByRole('navigation', { name: 'Codziennie' })
      await expect(daily.getByRole('link', { name: /Pulpit/ })).toBeVisible()
      await expect(daily.getByRole('link', { name: /Zapytania/ })).toBeVisible()
      await expect(
        page
          .getByRole('navigation', { name: 'Ceny' })
          .getByRole('link', { name: /Do zatwierdzenia/ }),
      ).toBeVisible()
      await expect(tabbar(page)).toBeHidden()
    }
  })

  test('the prices screen sits in the panel frame, "Do zatwierdzenia" highlighted', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/admin/ceny')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Ceny — publikacja i marże' }),
    ).toBeVisible()
    const current = isMobile
      ? tabbar(page).getByRole('link', { name: /Zatwierdź/ })
      : page
          .getByRole('navigation', { name: 'Ceny' })
          .getByRole('link', { name: /Do zatwierdzenia/ })
    await expect(current).toHaveAttribute('aria-current', 'page')
  })

  test('"Dane (listy)" lists Payload collections and passes axe', async ({ page }) => {
    await page.goto('/admin/dane')
    await expect(page.getByRole('heading', { level: 1, name: 'Dane (listy)' })).toBeVisible()
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Zapytania', exact: true }),
    ).toHaveAttribute('href', '/admin/collections/inquiries')
    const axe = await new AxeBuilder({ page })
      .include('[data-panel]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(axe.violations).toEqual([])
  })

  test('Payload lists keep a way back to the panel screens', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Payload nav is a drawer on a phone; the links are the same')
    await page.goto('/admin/collections/builds')
    const prices = page.getByRole('navigation', { name: 'Panel: Ceny' })
    await expect(prices.getByRole('link', { name: /Do zatwierdzenia/ })).toHaveAttribute(
      'href',
      '/admin/ceny',
    )
  })
})

test.describe('phone (414)', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone mode only')

  test.beforeEach(async ({ page }) => {
    await logIn(page)
  })

  test('bottom tabs of the boards: Pulpit · Zapytania · Zatwierdź · Zestawy · Więcej', async ({
    page,
  }) => {
    await page.goto('/admin/dane')
    const items = tabbar(page).getByRole('listitem')
    await expect(items).toHaveCount(5)
    await expect(items).toHaveText([/Pulpit/, /Zapytania/, /Zatwierdź/, /Zestawy/, /Więcej/])
    // Touch target ≥ 48 px (spec §2a pt 3).
    const box = await tabbar(page)
      .getByRole('link', { name: /Pulpit/ })
      .boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(48)
  })

  test('"Więcej" opens a sheet: focus inside, Esc and the backdrop close it, focus comes back', async ({
    page,
  }) => {
    await page.goto('/admin/dane')
    const more = tabbar(page).getByRole('button', { name: 'Więcej' })
    const sheet = page.getByRole('dialog', { name: 'Więcej' })

    await more.click()
    await expect(sheet).toBeVisible()
    await expect(more).toHaveAttribute('aria-expanded', 'true')
    await expect(sheet.getByRole('link', { name: /Zamówienia/ })).toBeVisible()
    await expect(sheet.getByRole('link', { name: /Dane \(listy\)/ })).toBeVisible()
    await expect(sheet.getByRole('link', { name: 'Wyloguj' })).toBeVisible()
    // Screens without their session yet are hidden, not dead links (spec §2a pt 3).
    await expect(sheet.getByRole('link', { name: /Statystyki/ })).toHaveCount(0)
    expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true)

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(more).toBeFocused()

    await more.click()
    await expect(sheet).toBeVisible()
    await page.mouse.click(200, 40) // the backdrop above the sheet
    await expect(sheet).toBeHidden()
  })

  for (const width of [360, 414]) {
    test(`no sideways scrolling at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      for (const path of ['/admin/ceny', '/admin/dane']) {
        await page.goto(path)
        await expect(page.locator('[data-panel]')).toBeVisible()
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(overflow, path).toBeLessThanOrEqual(0)
      }
    })
  }
})

test.describe('component preview (dev only)', () => {
  test.skip(process.env.E2E_SERVER === 'start', '/admin/podglad-panelu is 404 in production builds')

  test.beforeEach(async ({ page }) => {
    await logIn(page)
  })

  test('all components pass axe in both modes', async ({ page }) => {
    await page.goto('/admin/podglad-panelu')
    await expect(page.getByRole('heading', { level: 1, name: 'Podgląd komponentów' })).toBeVisible()
    const axe = await new AxeBuilder({ page })
      .include('[data-panel]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(axe.violations).toEqual([])
  })

  test('the table becomes cards with labels over values (phone)', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone mode only')
    await page.goto('/admin/podglad-panelu')
    const table = page.getByRole('table', { name: 'Zmiany cen (przykład)' })
    await expect(table.locator('thead')).toBeHidden()
    const label = await table
      .locator('tbody td[data-label="Nowa"]')
      .first()
      .evaluate((td) => getComputedStyle(td, '::before').content)
    expect(label).toBe('"Nowa"')
    await expect(table.getByRole('checkbox', { name: /Zatwierdź: 16 GB DDR4/ })).toBeChecked()
  })
})

test.describe('PWA manifest (ADR-G010 §2)', () => {
  test.skip(({ isMobile }) => isMobile, 'no layout involved: desktop project only')

  test('the manifest covers /admin only and opens full screen', async ({ request }) => {
    const response = await request.get('/admin/manifest.webmanifest')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/manifest+json')
    const manifest = (await response.json()) as Record<string, unknown>
    expect(manifest).toMatchObject({
      name: 'PRO-KOM Panel',
      scope: '/admin',
      start_url: '/admin',
      display: 'standalone',
      theme_color: '#080c0b',
    })
    const icons = manifest.icons as { src: string; sizes: string; purpose: string }[]
    expect(icons.map((i) => `${i.sizes} ${i.purpose}`)).toEqual([
      '192x192 any',
      '512x512 any',
      '512x512 maskable',
    ])
    for (const icon of icons) {
      const file = await request.get(icon.src)
      expect(file.status(), icon.src).toBe(200)
      expect(file.headers()['content-type']).toBe('image/png')
    }
  })

  test('the panel links the manifest and the iPhone icon; the site does not', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/admin/manifest.webmanifest',
    )
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/admin-assets/apple-touch-icon.png',
    )
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      'content',
      /viewport-fit=cover/,
    )
    await page.goto('/')
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(0)
  })
})
