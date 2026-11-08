import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * Side rail (GN-2, NAWIGACJA §4, §8): from 1400 px only, opens on hover and keyboard focus,
 * jumps to the home sections and marks the active one, „Na tej stronie” on a build page, not on
 * the account pages. Widths are set here, so it runs in the desktop project only.
 */

test.skip(({ isMobile }) => isMobile, 'the rail is a wide-desktop element')

const rail = (page: Page) => page.getByRole('navigation', { name: 'Sekcje strony' })

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
})

test('home: 11 sections, hover opens, a click jumps, the active one follows the scroll', async ({
  page,
}) => {
  await page.goto('/')
  await expect(rail(page)).toBeVisible()
  const links = rail(page).locator('a[href^="#"]')
  await expect(links).toHaveCount(11)
  await expect(rail(page)).toHaveAttribute('data-open', 'false')

  await rail(page).hover()
  await expect(rail(page)).toHaveAttribute('data-open', 'true')
  await rail(page)
    .getByRole('link', { name: /Jak kupić/ })
    .click()
  await expect(page).toHaveURL(/#jak-kupic$/)
  await expect(page.locator('#jak-kupic')).toBeInViewport()
  await expect(rail(page).getByRole('link', { name: /Jak kupić/ })).toHaveAttribute(
    'aria-current',
    'location',
  )

  await page.locator('#w-cenie').scrollIntoViewIfNeeded()
  await page.mouse.wheel(0, 120)
  await expect(rail(page).getByRole('link', { name: /W cenie/ })).toHaveAttribute(
    'aria-current',
    'location',
  )
  // Only one active entry at a time.
  await expect(rail(page).locator('[aria-current="location"]')).toHaveCount(1)

  // After a mouse click the rail closes once the mouse leaves (focus alone does not hold it).
  await page.mouse.move(900, 500)
  await expect(rail(page)).toHaveAttribute('data-open', 'false')

  // Back to top: the ring appears after scrolling and brings the page up; focus stays in the rail.
  await rail(page)
    .getByRole('button', { name: /Do góry/ })
    .focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5)
  await expect(rail(page).getByRole('button', { name: /Szukaj zestawu lub gry/ })).toBeFocused()
})

test('keyboard: focus opens the rail, Esc closes it, arrows move between entries', async ({
  page,
}) => {
  await page.goto('/')
  await rail(page)
    .getByRole('button', { name: /Szukaj zestawu lub gry/ })
    .focus()
  await expect(rail(page)).toHaveAttribute('data-open', 'true')
  await page.keyboard.press('ArrowDown')
  await expect(rail(page).getByRole('link', { name: /Start/ })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(rail(page)).toHaveAttribute('data-open', 'false')
})

test('no rail below 1400 px nor on the account pages', async ({ page }) => {
  await page.setViewportSize({ width: 1399, height: 900 })
  await page.goto('/')
  await expect(page.locator('.hero')).toBeVisible()
  await expect(rail(page)).toHaveCount(0)

  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(rail(page)).toBeVisible()
  await page.goto('/konto/logowanie')
  await expect(page.locator('main')).toBeVisible()
  await expect(rail(page)).toHaveCount(0)
})

test('build page: „Na tej stronie” jumps to its sections, home sections fold into one entry', async ({
  page,
}) => {
  await page.goto('/zestawy/wampir')
  await expect(rail(page).getByText('Na tej stronie · Wampir')).toBeAttached()
  await rail(page).hover()
  await rail(page).getByRole('link', { name: 'Co jest w środku' }).click()
  await expect(page).toHaveURL(/#wnetrze$/)
  await expect(page.locator('#wnetrze')).toBeInViewport()
  // The section heading lands below the header and the sticky price bar, not under them.
  await expect
    .poll(async () => {
      const bar = await page.locator('.bp-bar').boundingBox()
      const heading = await page.locator('#wnetrze h2').boundingBox()
      return heading!.y - (bar!.y + bar!.height)
    })
    .toBeGreaterThanOrEqual(0)

  await expect(rail(page).locator('a[href^="/#"]')).toHaveCount(0)
  const fold = rail(page).getByRole('button', { name: /Sekcje strony głównej/ })
  await expect(fold).toHaveAttribute('aria-expanded', 'false')
  await fold.click()
  await expect(rail(page).locator('a[href^="/#"]')).toHaveCount(11)
  await expect(rail(page).getByRole('link', { name: /W cenie/ })).toHaveAttribute(
    'href',
    '/#w-cenie',
  )
})

test('the open rail passes axe', async ({ page }) => {
  await page.goto('/')
  await rail(page).hover()
  await expect(rail(page)).toHaveAttribute('data-open', 'true')
  const { violations } = await new AxeBuilder({ page })
    .include('nav[aria-label="Sekcje strony"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(violations.map((v) => ({ rule: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([])
})
