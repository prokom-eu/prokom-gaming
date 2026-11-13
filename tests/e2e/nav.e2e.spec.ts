import { expect, test, type Page } from '@playwright/test'

// GN-1 (ADR-G012, NAWIGACJA.md §2, §6): header in the new look on every width, fixed and hiding
// on desktop too (decision 05.11), sticky bars under it, the phone tab bar with the gold orb.

/**
 * Right edge of the right-most visible control in the header — nothing may run off screen. The
 * header pads 28 px; fonts render a few px wider on Linux (CI) than on Windows, so the check
 * keeps at least 16 px instead of the full padding.
 */
const EDGE = 16
const headerRight = (page: Page) =>
  page.evaluate(() =>
    Math.max(
      ...[...document.querySelectorAll('header.nav a, header.nav button')]
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => el.getBoundingClientRect().right),
    ),
  )

/**
 * Scrolls down until the header hides. A wheel turn right after `goto` can land before React
 * attaches the scroll listener (the first reading then shows the header on purpose — a reload in
 * the middle of the page), so keep turning until the header reacts.
 */
async function scrollUntilHidden(page: Page, step: number) {
  await expect
    .poll(async () => {
      await page.mouse.wheel(0, step)
      return page.locator('header.nav').getAttribute('data-hidden')
    })
    .toBe('true')
  // Let the last scroll frames land, so the next step starts from a still page.
  let last = -1
  await expect
    .poll(async () => {
      const y = await page.evaluate(() => window.scrollY)
      const still = y === last
      last = y
      return still
    })
    .toBe(true)
}

test.describe('desktop header', () => {
  test.skip(({ isMobile }) => isMobile, 'phone tested below')

  test('1440: links in the capsule, active page pill, two-line answer time', async ({ page }) => {
    await page.goto('/zestawy')
    const nav = page.getByRole('navigation', { name: 'Główne' })
    await expect(nav).toBeVisible()
    const active = nav.getByRole('link', { name: 'Zestawy', exact: true })
    await expect(active).toHaveAttribute('aria-current', 'page')
    await expect(active).toHaveCSS('background-image', /linear-gradient/)
    await expect(nav.getByRole('link', { name: 'Konfigurator' })).not.toHaveAttribute(
      'aria-current',
    )
    await expect(
      page.getByRole('link', { name: 'Odpowiadamy w godzinę codziennie 9–22' }),
    ).toBeVisible()
    await expect(page.locator('header.nav')).toHaveCSS('height', '76px')
    expect(await headerRight(page)).toBeLessThanOrEqual(1440 - EDGE)
  })

  for (const { width, phone, caps } of [
    { width: 1400, phone: true, caps: true },
    { width: 1399, phone: false, caps: true },
    { width: 1200, phone: false, caps: true },
    { width: 1199, phone: false, caps: false },
    { width: 1100, phone: false, caps: false },
  ]) {
    test(`${width}: fits the screen${caps ? '' : ' with the hamburger'}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/zestawy')
      const answer = page.getByRole('link', { name: /Odpowiadamy w godzinę/ })
      await (phone ? expect(answer).toBeVisible() : expect(answer).toBeHidden())
      const nav = page.getByRole('navigation', { name: 'Główne' })
      await (caps ? expect(nav).toBeVisible() : expect(nav).toBeHidden())
      const burger = page.getByRole('button', { name: 'Otwórz menu' })
      await (caps ? expect(burger).toBeHidden() : expect(burger).toBeVisible())
      await expect(page.getByRole('link', { name: 'Dobierz komputer' })).toBeVisible()
      expect(await headerRight(page)).toBeLessThanOrEqual(width - EDGE)
    })
  }

  test('hides on scroll down, comes back as glass and keeps the price bar under it', async ({
    page,
  }) => {
    await page.goto('/zestawy/wampir')
    const header = page.locator('header.nav')
    await expect(header).toHaveAttribute('data-top', 'true')
    await scrollUntilHidden(page, 1600)
    await expect(header).not.toBeInViewport()
    await expect.poll(async () => (await page.locator('.bp-bar').boundingBox())?.y).toBe(0)

    await page.mouse.wheel(0, -200)
    await expect(header).toHaveAttribute('data-hidden', 'false')
    await expect(header).toHaveAttribute('data-scrolled', 'true')
    await expect(header).toHaveCSS('height', '66px')
    await expect(header).toHaveCSS('backdrop-filter', /blur/)
    // The sticky price bar slides down under the header instead of hiding behind it.
    await expect.poll(async () => (await page.locator('.bp-bar').boundingBox())?.y).toBe(66)
  })

  test('sticky side panels and anchor jumps stay below the header', async ({ page }) => {
    // Table of contents of a legal page: sticky at 24 px + the header while it is shown.
    await page.goto('/regulamin')
    const header = page.locator('header.nav')
    const toc = page.getByRole('navigation', { name: 'Spis treści' })
    // Down in small steps until the panel sticks (24 px, header hidden) — page length differs
    // between databases — then a bit further, so a short move up keeps it stuck.
    await expect
      .poll(async () => {
        await page.mouse.wheel(0, 200)
        return (await toc.boundingBox())?.y ?? 999
      })
      .toBeLessThanOrEqual(25)
    await page.mouse.wheel(0, 400)
    await expect(header).toHaveAttribute('data-hidden', 'true')
    await page.mouse.wheel(0, -100)
    await expect(header).toHaveAttribute('data-hidden', 'false')
    await expect.poll(async () => Math.round((await toc.boundingBox())?.y ?? 0)).toBe(66 + 24)

    // A jump up to the first section brings the header back: the heading stays visible under it.
    const first = toc.getByRole('link').first()
    const id = ((await first.getAttribute('href')) ?? '').slice(1)
    await first.click()
    await expect
      .poll(async () => (await page.locator(`[id="${id}"]`).boundingBox())?.y ?? 0)
      .toBeGreaterThanOrEqual(76)
  })

  test('a keyboard user tabbing into the hidden header gets it back', async ({ page }) => {
    await page.goto('/zestawy/wampir')
    const header = page.locator('header.nav')
    await scrollUntilHidden(page, 1600)
    await header.getByRole('link', { name: 'Moje konto' }).focus()
    await expect(header).toHaveAttribute('data-hidden', 'false')
  })

  test('Dla rodziców: light over the light section, dark once the page moves', async ({ page }) => {
    await page.goto('/dla-rodzicow')
    const header = page.locator('header.nav')
    const link = page.getByRole('navigation', { name: 'Główne' }).getByRole('link', {
      name: 'O nas',
    })
    // --par-nav #3a3226 over the light section.
    await expect(link).toHaveCSS('color', 'rgb(58, 50, 38)')
    await scrollUntilHidden(page, 900)
    await page.mouse.wheel(0, -200)
    await expect(header).toHaveAttribute('data-top', 'false')
    // --nav-link #cdc3ab on the solid dark header.
    await expect(link).toHaveCSS('color', 'rgb(205, 195, 171)')
    await expect(header).toHaveCSS('background-image', /linear-gradient/)
  })
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'desktop tested above')

  test('tab bar: the gold orb above the bar, the active tab with a gold line', async ({ page }) => {
    await page.goto('/zestawy')
    const tabs = page.getByRole('navigation', { name: 'Nawigacja główna' })
    const bar = await tabs.boundingBox()
    const orb = await tabs.locator('.tabbar__main i').boundingBox()
    expect(Math.round(orb?.width ?? 0)).toBe(46)
    // Pulled up 18 px as on board 10 (.ti.mid .orb) — it sticks out above the bar.
    await expect(tabs.locator('.tabbar__main i')).toHaveCSS('margin-top', '-18px')
    expect(orb?.y ?? 0).toBeLessThan(bar?.y ?? 0)

    const active = tabs.getByRole('link', { name: 'Zestawy' })
    await expect(active).toHaveAttribute('aria-current', 'page')
    const line = await active.evaluate((el) => getComputedStyle(el, '::before').height)
    expect(line).toBe('2px')
  })

  test('header: comparison and account with a 44 px touch area', async ({ page }) => {
    await page.goto('/zestawy')
    const account = page.locator('header').getByRole('link', { name: 'Moje konto' })
    await expect(account).toHaveCSS('width', '36px')
    const touch = await account.evaluate((el) => {
      const after = getComputedStyle(el, '::after')
      return 36 - 2 * parseFloat(after.top)
    })
    expect(touch).toBeGreaterThanOrEqual(44)
  })

  test('menu: the page you are on is marked', async ({ page }) => {
    await page.goto('/o-nas')
    await page
      .getByRole('navigation', { name: 'Nawigacja główna' })
      .getByRole('button', { name: 'Menu' })
      .click()
    const menu = page.getByRole('dialog', { name: 'Menu' })
    await expect(menu.getByRole('link', { name: 'O nas' })).toHaveAttribute('aria-current', 'page')
    await expect(menu.getByRole('link', { name: 'Kontakt i dojazd' })).not.toHaveAttribute(
      'aria-current',
    )
  })
})
