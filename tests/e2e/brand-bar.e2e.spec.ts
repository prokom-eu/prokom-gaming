import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Runda 18.11 (GM-R1, MOTYW-PASEK-LINII §4–§5): the PRO-KOM brand bar above the header from
// 1081 px, Gaming last and current; below 1081 px the lines are chips in the menu sheet. `?motyw=`
// from another line is taken out of the address bar, the site stays dark.

const LINES = ['PRO-KOM', 'Biznes', 'Instalacje', 'Software', 'Tech', 'Gaming']

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'brand bar from 1081 px')

  test('lines in order, Gaming current, header under the bar and rising with the scroll', async ({
    page,
  }) => {
    await page.goto('/')
    const bar = page.getByRole('navigation', { name: 'Linie PRO-KOM' })
    await expect(bar).toBeVisible()
    const links = bar.getByRole('link')
    await expect(links).toHaveText(LINES)
    await expect(links.last()).toHaveAttribute('aria-current', 'page')
    await expect(bar.getByRole('link', { name: 'Biznes' })).toHaveAttribute(
      'href',
      'https://prokombiznes.pl',
    )
    // Right half: hours and the Gaming phone.
    await expect(page.locator('.bbar__right a[href^="tel:"]')).toBeVisible()

    const headerTop = () =>
      page.evaluate(() =>
        Math.round(document.querySelector('header.nav')!.getBoundingClientRect().top),
      )
    await expect.poll(headerTop).toBe(38)
    await page.evaluate(() => window.scrollTo(0, 300))
    await expect.poll(headerTop).toBeLessThanOrEqual(0)
  })

  test('pill follows the focus, the tooltip shows at once and Esc hides it', async ({ page }) => {
    await page.goto('/')
    const biznes = page.getByRole('link', { name: 'Biznes' }).first()
    await biznes.focus()
    const tip = page.locator('#bbar-tip-biznes')
    await expect(biznes).toHaveAttribute('aria-describedby', 'bbar-tip-biznes')
    await expect(tip).toBeVisible()
    await expect(tip).toHaveText('Kasy, komputery, opieka IT')
    // The pill sits under the focused line (measured against the list).
    await expect
      .poll(() =>
        page.evaluate(() => {
          const pill = document.querySelector('.bbar__pill')!.getBoundingClientRect()
          const line = [...document.querySelectorAll('.bbar__line')]
            .find((el) => el.textContent === 'Biznes')!
            .getBoundingClientRect()
          return Math.abs(pill.left - line.left) < 1 && Math.abs(pill.width - line.width) < 1
        }),
      )
      .toBe(true)
    await page.keyboard.press('Escape')
    await expect(tip).toBeHidden()
  })

  // `/dla-rodzicow` starts under a light section: the bar switches to dark text there.
  for (const path of ['/', '/dla-rodzicow']) {
    test(`no axe errors in the bar on ${path}`, async ({ page }) => {
      // Mid-entrance (opacity) axe would measure a faded colour.
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto(path)
      await expect(page.locator('[data-brand-bar]')).toBeVisible()
      const results = await new AxeBuilder({ page }).include('[data-brand-bar]').analyze()
      expect(results.violations).toEqual([])
    })
  }

  test('after Esc the tooltip stays hidden while the pointer moves inside the same line', async ({
    page,
  }) => {
    await page.goto('/')
    const tech = page.locator('.bbar__line', { hasText: 'Tech' })
    const tip = page.locator('#bbar-tip-tech')
    const box = (await tech.boundingBox())!
    await page.mouse.move(box.x + 12, box.y + box.height / 2)
    await expect(tip).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(tip).toBeHidden()
    // From the dash onto the text of the same link.
    await page.mouse.move(box.x + box.width - 8, box.y + box.height / 2, { steps: 5 })
    await page.waitForTimeout(600)
    await expect(tip).toBeHidden()
  })

  test('the first tooltip stays on screen', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'PRO-KOM', exact: true }).first().focus()
    const tip = page.locator('#bbar-tip-prokom')
    await expect(tip).toBeVisible()
    expect((await tip.boundingBox())!.x).toBeGreaterThanOrEqual(0)
  })
})

test('?motyw= is removed from the address after loading, the site stays dark', async ({ page }) => {
  await page.goto('/zestawy?motyw=jasny#lista')
  await expect.poll(() => page.url()).toMatch(/\/zestawy#lista$/)
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/)
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(
    'dark',
  )
  // The canonical address never carries the parameter.
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/zestawy$/)
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'menu sheet below 1081 px')

  test('no bar, line chips in the menu, no sideways scroll', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[data-brand-bar]')).toBeHidden()
    await page.getByRole('button', { name: 'Menu', exact: true }).click()
    const chips = page.locator('.menu__line')
    await expect(chips).toHaveText(LINES)
    await expect(chips.last()).toHaveAttribute('aria-current', 'page')
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => window.innerWidth),
    )
  })
})
