import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * Search (GN-3, NAWIGACJA §5, §8): Ctrl K / „/” / the header's magnifier / the rail open it,
 * „fortn” + Enter goes to the game's page, Shift+Enter to the picker, nothing found → „Zapytaj”,
 * Esc returns the focus, on a phone it is a full-height sheet.
 */

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Szukaj' })
const field = (page: Page) => dialog(page).getByRole('combobox')

async function home(page: Page) {
  await page.goto('/')
  await expect(page.locator('.hero')).toHaveAttribute('data-material', 'krew')
}

/**
 * Press the shortcut until the dialog shows. The page is server-rendered, so nothing visible
 * tells when React has attached the key listener; a press before that is lost (opening twice
 * is harmless: `openSearch` only sets the state).
 */
async function openWith(page: Page, key: string) {
  await expect(async () => {
    // Press again only while nothing opened: a second „/” would be typed into the open field.
    if (!(await dialog(page).isVisible())) await page.keyboard.press(key)
    await expect(dialog(page)).toBeVisible({ timeout: 4_000 })
  }).toPass({ timeout: 20_000 })
}

test.describe('desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard shortcuts and widths of a desktop')

  test('Ctrl K → „fortn” → Enter opens the game page', async ({ page }) => {
    await home(page)
    await openWith(page, 'Control+k')
    await expect(dialog(page)).toBeVisible()
    await expect(field(page)).toBeFocused()
    await field(page).fill('fortn')
    await expect(dialog(page).getByRole('option').first()).toContainText('Fortnite')
    await expect(dialog(page).getByText('Zestawy pod Fortnite')).toBeVisible()
    await page.keyboard.press('Enter')
    // `next dev` compiles the game page on its first visit: give the navigation time.
    await expect(page).toHaveURL(/\/komputer-do\/fortnite$/, { timeout: 30_000 })
    await expect(dialog(page)).toHaveCount(0)
  })

  test('Shift+Enter on a game opens „Dobór pod grę” with it', async ({ page }) => {
    await home(page)
    await openWith(page, 'Control+k')
    await field(page).fill('cs2')
    await expect(dialog(page).getByRole('option').first()).toContainText('Counter-Strike 2')
    await page.keyboard.press('Shift+Enter')
    await expect(page).toHaveURL(/\/dobor-pod-gre\?gra=counter-strike-2(&|$)/)
  })

  test('nothing found → „Zapytaj” leads to the inquiry', async ({ page }) => {
    await home(page)
    await openWith(page, 'Control+k')
    await field(page).fill('xyz')
    await expect(dialog(page).getByRole('option')).toHaveText([/Nie mamy tego w bazie/])
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/zapytanie$/)
  })

  test('arrows move the selection; „/” opens outside fields only', async ({ page }) => {
    await home(page)
    await openWith(page, '/')
    await expect(dialog(page)).toBeVisible()
    // „Popularne” without a query: the first option is selected, ↓ moves to the next.
    const options = dialog(page).getByRole('option')
    await expect(options.first()).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('ArrowDown')
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true')
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)

    // Typing „/” in a form field is just a character.
    await page.goto('/kontakt')
    const name = page.getByLabel('Imię')
    await name.fill('a/b')
    await expect(name).toHaveValue('a/b')
    await expect(dialog(page)).toHaveCount(0)
  })

  test('1399 px: the header magnifier opens it, Esc returns the focus there', async ({ page }) => {
    await page.setViewportSize({ width: 1399, height: 900 })
    await home(page)
    const lupa = page.getByRole('banner').getByRole('button', { name: 'Szukaj' })
    await lupa.click()
    await expect(dialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    await expect(lupa).toBeFocused()
  })

  test('1440 px: no magnifier in the header, the rail opens the search', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await home(page)
    await expect(page.getByRole('banner').getByRole('button', { name: 'Szukaj' })).toBeHidden()
    await page
      .getByRole('navigation', { name: 'Sekcje strony' })
      .getByRole('button', { name: /Szukaj zestawu lub gry/ })
      .click()
    await expect(dialog(page)).toBeVisible()
    await field(page).fill('kikimra')
    await expect(dialog(page).getByRole('option').first()).toContainText('Kikimora')
  })

  test('1440 px without the rail (account pages): the magnifier stays in the header', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/konto/logowanie')
    await expect(page.getByRole('navigation', { name: 'Sekcje strony' })).toHaveCount(0)
    await expect(page.getByRole('banner').getByRole('button', { name: 'Szukaj' })).toBeVisible()
  })

  test('the open dialog passes axe', async ({ page }) => {
    await home(page)
    await openWith(page, 'Control+k')
    await field(page).fill('wampir')
    await expect(dialog(page).getByRole('option').first()).toContainText('Wampir')
    const { violations } = await new AxeBuilder({ page })
      .include('dialog.sd')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(violations.map((v) => ({ rule: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual(
      [],
    )
  })
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone layout')

  test('the magnifier opens a full-height sheet with the keyboard ready', async ({ page }) => {
    await home(page)
    await page.getByRole('banner').getByRole('button', { name: 'Szukaj' }).click()
    await expect(dialog(page)).toBeVisible()
    await expect(field(page)).toBeFocused()
    const box = await dialog(page).boundingBox()
    const height = page.viewportSize()!.height
    expect(box!.height).toBeGreaterThanOrEqual(height - 2)
    await field(page).fill('dla syna')
    await expect(dialog(page).getByRole('option').first()).toContainText('Dla rodziców')
  })

  test('the menu has a search field that opens the sheet', async ({ page }) => {
    await home(page)
    await page.getByRole('button', { name: 'Menu' }).last().click()
    await page.getByRole('button', { name: /Szukaj istoty, gry albo strony/ }).click()
    await expect(dialog(page)).toBeVisible()
  })

  test('closed after opening from the menu, the focus returns to the Menu button', async ({
    page,
  }) => {
    await home(page)
    const menuButton = page.getByRole('button', { name: 'Menu' }).last()
    await menuButton.focus()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: /Szukaj istoty, gry albo strony/ }).click()
    await expect(dialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    await expect(menuButton).toBeFocused()
  })
})
