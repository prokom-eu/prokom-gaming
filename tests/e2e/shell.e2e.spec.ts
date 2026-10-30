import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Site shell (G2): header, tab bar, menu sheet, footer and the 404 page (ADR-G003 §4).
const MISSING = '/nie-ma-takiej-strony'
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

const isPhone = (name: string) => name === 'mobile-414'

async function axeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  return violations.map((v) => ({ rule: v.id, targets: v.nodes.map((n) => n.target) }))
}

test.describe('404', () => {
  test('unknown address returns 404 with the Licho page inside the shell', async ({ page }) => {
    const response = await page.goto(MISSING)
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Licho tu było i stronę zabrało',
    )
    await expect(page.getByRole('link', { name: 'Strona główna', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Wszystkie zestawy' }).first()).toBeVisible()
    await expect(page.locator('footer')).toContainText('PRO-KOM Tadeusz Wójciak')
    // No placeholder in brackets in the HTML (spec. §27.7).
    expect(await page.content()).not.toMatch(/\[(do potwierdzenia|link [^\]]*)\]/)
  })

  test('API addresses are not swallowed by the site catch-all (/admin: a11y spec)', async ({
    request,
  }) => {
    expect((await request.get('/api/health')).status()).toBe(200)
  })
})

test.describe('desktop and tablet', () => {
  test.skip(({ isMobile }) => isMobile, 'phone layout tested below')

  test('header shows the 7 links and the CTA; tab bar is hidden', async ({ page }) => {
    await page.goto(MISSING)
    const nav = page.getByRole('navigation', { name: 'Główne' })
    for (const label of [
      'Zestawy',
      'Konfigurator',
      'Dobór pod grę',
      'Porównaj',
      'Dla rodziców',
      'O nas',
      'Kontakt',
    ]) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible()
    }
    await expect(page.getByRole('link', { name: 'Dobierz komputer' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Nawigacja główna' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Otwórz menu' })).toBeHidden()
  })

  test('tablet 820: hamburger opens the menu as a panel from the right', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 })
    await page.goto(MISSING)
    await expect(page.getByRole('navigation', { name: 'Nawigacja główna' })).toBeHidden()
    const burger = page.getByRole('button', { name: 'Otwórz menu' })
    await burger.click()
    const menu = page.getByRole('dialog', { name: 'Menu' })
    await expect(menu).toBeVisible()
    const box = await menu.boundingBox()
    expect(box?.x).toBeGreaterThan(390) // 820 − 420 px panel
    expect(Math.round(box?.width ?? 0)).toBe(420)
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(burger).toBeFocused()
  })
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'desktop layout tested above')

  test('compact header and the bottom tab bar', async ({ page }) => {
    await page.goto(MISSING)
    const tabs = page.getByRole('navigation', { name: 'Nawigacja główna' })
    await expect(tabs).toBeVisible()
    for (const label of ['Zestawy', 'Pod grę', 'Konfigurator', 'Zapytanie']) {
      await expect(tabs.getByRole('link', { name: label })).toBeVisible()
    }
    await expect(tabs.getByRole('button', { name: 'Menu' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Dobierz komputer' })).toBeHidden()
    await expect(page.locator('header').getByRole('link', { name: 'Moje konto' })).toBeVisible()
    const box = await tabs.boundingBox()
    expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(page.viewportSize()?.height)
  })

  test('menu sheet: opens, keeps focus inside, closes with Esc and returns focus', async ({
    page,
  }) => {
    await page.goto(MISSING)
    const opener = page
      .getByRole('navigation', { name: 'Nawigacja główna' })
      .getByRole('button', { name: 'Menu' })
    await opener.click()
    const menu = page.getByRole('dialog', { name: 'Menu' })
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('link', { name: /Wampir/ })).toBeAttached()
    // „Gotowe od ręki” is behind FEATURE_READY (G13); „Poradniki” is always in the menu.
    await expect(menu.getByRole('link', { name: /Poradniki/ })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Napisz' })).toBeAttached()

    // The page behind is inert: tabbing never leaves the sheet.
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(
        () =>
          document.activeElement === document.body || !!document.activeElement?.closest('#menu'),
      )
      expect(inside).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(opener).toBeFocused()
  })

  test('menu sheet closes with the close button, the backdrop and a drag down', async ({
    page,
  }) => {
    await page.goto(MISSING)
    const opener = page
      .getByRole('navigation', { name: 'Nawigacja główna' })
      .getByRole('button', { name: 'Menu' })
    const menu = page.getByRole('dialog', { name: 'Menu' })

    await opener.click()
    await menu.getByRole('button', { name: 'Zamknij menu' }).click()
    await expect(menu).toBeHidden()

    await opener.click()
    await expect(menu).toBeVisible()
    await page.mouse.click(200, 20) // backdrop above the sheet
    await expect(menu).toBeHidden()

    await opener.click()
    await expect(menu).toBeVisible()
    // Wait for the slide-in to finish, so the grab bar is where the finger will be.
    await page.waitForFunction(() => document.getElementById('menu')?.getAnimations().length === 0)
    const grab = await menu.locator('.sheet__grab').boundingBox()
    if (!grab) throw new Error('no grab bar')
    const x = grab.x + grab.width / 2
    await page.mouse.move(x, grab.y + 2)
    await page.mouse.down()
    await page.mouse.move(x, grab.y + 80, { steps: 5 })
    await page.mouse.move(x, grab.y + 240, { steps: 5 })
    await page.mouse.up()
    await expect(menu).toBeHidden()
  })

  test('a link in the menu navigates and closes the sheet', async ({ page }) => {
    await page.goto(MISSING)
    await page
      .getByRole('navigation', { name: 'Nawigacja główna' })
      .getByRole('button', { name: 'Menu' })
      .click()
    const menu = page.getByRole('dialog', { name: 'Menu' })
    await menu.getByRole('link', { name: 'O nas' }).click()
    await expect(page).toHaveURL(/\/o-nas$/)
    await expect(menu).toBeHidden()
  })

  test('a link to the current page also closes the sheet', async ({ page }) => {
    await page.goto('/o-nas')
    await page
      .getByRole('navigation', { name: 'Nawigacja główna' })
      .getByRole('button', { name: 'Menu' })
      .click()
    const menu = page.getByRole('dialog', { name: 'Menu' })
    await expect(menu).toBeVisible()
    await menu.getByRole('link', { name: 'O nas' }).click()
    await expect(menu).toBeHidden()
  })

  test('header hides on scroll down and returns on scroll up', async ({ page }) => {
    await page.goto(MISSING)
    const header = page.locator('header.nav')
    await page.mouse.wheel(0, 600)
    await expect(header).toHaveAttribute('data-hidden', 'true')
    await expect(header).not.toBeInViewport()
    await page.mouse.wheel(0, -200)
    await expect(header).toHaveAttribute('data-hidden', 'false')
    // Back on screen at the top of the viewport, with the solid background (not over the scene).
    await expect(header).toBeInViewport()
    await expect.poll(async () => (await header.boundingBox())?.y).toBe(0)
    await expect(header).toHaveAttribute('data-top', 'false')
  })

  test('axe passes with the menu open', async ({ page }) => {
    await page.goto(MISSING)
    await page
      .getByRole('navigation', { name: 'Nawigacja główna' })
      .getByRole('button', { name: 'Menu' })
      .click()
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()
    expect(await axeViolations(page)).toEqual([])
  })
})

test.describe('counters from localStorage', () => {
  test('comparison and inquiry counts show; broken values are ignored', async ({
    page,
  }, testInfo) => {
    await page.goto(MISSING)
    await page.evaluate(() => {
      localStorage.setItem('pkg:compare', JSON.stringify(['wampir', 'baba-jaga']))
      localStorage.setItem('pkg:inquiry', JSON.stringify([{ build: 'wampir' }]))
    })
    await page.reload()
    await expect(page.getByRole('link', { name: 'Porównanie, 2 zestawy' })).toBeVisible()
    if (isPhone(testInfo.project.name)) {
      await expect(
        page
          .getByRole('navigation', { name: 'Nawigacja główna' })
          .getByText('1 komputer w zapytaniu'),
      ).toBeAttached()
    }

    await page.evaluate(() => localStorage.setItem('pkg:compare', '{broken'))
    await page.reload()
    await expect(page.getByRole('link', { name: 'Porównanie', exact: true })).toBeVisible()
  })
})

test.describe('component preview (dev only)', () => {
  test.skip(process.env.E2E_SERVER === 'start', '/podglad-ui is 404 in production builds')

  test('base components pass axe; Segmented works with arrows', async ({ page }) => {
    await page.goto('/podglad-ui')
    // The first one: the FPS list below has its own resolution switch (tested separately).
    const group = page.getByRole('radiogroup', { name: 'Rozdzielczość' }).first()
    await group.getByRole('radio', { name: 'FullHD' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(group.getByRole('radio', { name: '2K' })).toBeFocused()
    await expect(group.getByRole('radio', { name: '2K' })).toHaveAttribute('aria-checked', 'true')
    // 4K is disabled in the preview: the arrow skips it and wraps to FullHD.
    await expect(group.getByRole('radio', { name: '4K' })).toBeDisabled()
    await page.keyboard.press('ArrowRight')
    await expect(group.getByRole('radio', { name: 'FullHD' })).toBeFocused()
    await expect(group.getByRole('radio', { name: 'FullHD' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(page.getByRole('region', { name: 'Ciasteczka, ale bez podstępu' })).toBeVisible()
    expect(await axeViolations(page)).toEqual([])

    // Both answers have equal weight and close the banner.
    const banner = page.getByRole('region', { name: 'Ciasteczka, ale bez podstępu' })
    await expect(banner.getByRole('button', { name: 'Odrzuć' })).toHaveClass(/btn--ghost/)
    await expect(banner.getByRole('button', { name: 'Akceptuję' })).toHaveClass(/btn--ghost/)
    await banner.getByRole('button', { name: 'Odrzuć' }).click()
    await expect(banner).toBeHidden()
  })
})

// G5: „Ile klatek w Twojej grze” for Wampir from the seeded database (board Zestaw, stany/tel-06).
test.describe('FPS list (dev preview)', () => {
  test.skip(process.env.E2E_SERVER === 'start', '/podglad-ui is 404 in production builds')

  test('every number has its source; 2K → 4K switches the numbers; axe passes', async ({
    page,
  }, testInfo) => {
    await page.goto('/podglad-ui')
    const list = page.locator('section.fps')
    await expect(list.getByRole('heading', { name: 'Ile klatek w Twojej grze' })).toBeVisible()
    const rows = list.locator('.fps__row')
    await expect(rows).toHaveCount(12)
    for (const row of await rows.all()) {
      await expect(row.locator('.src')).toHaveText(
        /^(zmierzone w PRO-KOM|test niezależny|przeliczone z testów|szacunek)$/,
      )
    }

    // Seed values for Wampir (fps-sources.json): Counter-Strike 2 362 FPS in 2K, 194 in 4K.
    const cs2 = rows.filter({ hasText: 'Counter-Strike 2' })
    const segments = list.getByRole('radiogroup', { name: 'Rozdzielczość' })
    await expect(segments.getByRole('radio', { name: '2K' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(cs2.locator('b')).toHaveText('362 FPS')
    await segments.getByRole('radio', { name: '4K' }).click()
    await expect(cs2.locator('b')).toHaveText('194 FPS')
    await expect(cs2.locator('.src')).toHaveText('test niezależny')

    if (isPhone(testInfo.project.name)) {
      // Phone layout (tel-06): FPS on the game's line, the label under the bar.
      const name = await cs2.locator('.fps__game').boundingBox()
      const fps = await cs2.locator('b').boundingBox()
      const label = await cs2.locator('.src').boundingBox()
      const bar = await cs2.locator('.fps__bar').boundingBox()
      expect(Math.abs((name?.y ?? 0) - (fps?.y ?? 99))).toBeLessThan(8)
      expect(label?.y ?? 0).toBeGreaterThan(bar?.y ?? 999)
    }

    expect(await axeViolations(page)).toEqual([])
  })

  test('„Jak liczymy?” opens a sheet with the source of every number; Esc closes it', async ({
    page,
  }) => {
    await page.goto('/podglad-ui')
    const button = page.locator('section.fps').getByRole('button', { name: 'Jak liczymy?' })
    await button.click()
    const sheet = page.getByRole('dialog', { name: 'Jak liczymy?' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('heading', { name: 'Skąd są liczby' })).toBeVisible()
    await expect(sheet.getByRole('heading', { name: 'Co znaczą kolory' })).toBeVisible()
    await expect(sheet.locator('.how__sources li')).toHaveCount(12)
    for (const link of await sheet.locator('.how__sources a').all()) {
      await expect(link).toHaveAttribute('href', /^https:\/\//)
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
    expect(await axeViolations(page)).toEqual([])

    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(button).toBeFocused()
  })
})
