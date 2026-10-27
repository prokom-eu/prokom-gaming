import { expect, test } from '@playwright/test'

/**
 * Home sections 3–7 (G8, spec. §4 pt 3–7): order of the sections, 16 creature cards in price
 * order with a source next to every FPS number, the games panel switching game and resolution,
 * and the rows that scroll sideways on a phone (ADR-G003 §4).
 */

const SECTIONS = [
  'Od czego zaczynasz?',
  'Szesnaście istot. Każda gra po swojemu.',
  'Jak kupić, skoro nie ma przycisku „Kup”',
  'W co grasz?',
  'Zanim komputer wyjedzie z Rabki',
]

const price = (text: string) => Number(text.replace(/\D/g, ''))

test('sections follow the board order', async ({ page }) => {
  await page.goto('/')
  // textContent, not innerText: sections below the fold are not rendered yet (content-visibility).
  const headings = await page.locator('main h2').allTextContents()
  const found = SECTIONS.map((title) =>
    headings.findIndex((h) => h.replace(/\s+/g, '') === title.replace(/\s+/g, '')),
  )
  expect(
    found.every((i) => i >= 0),
    headings.join(' | '),
  ).toBe(true)
  expect([...found].sort((a, b) => a - b)).toEqual(found)
})

test('16 creature cards in price order, every FPS number with its source', async ({ page }) => {
  await page.goto('/')
  const cards = page.locator('.hm-card')
  await expect(cards).toHaveCount(16)
  const prices = (await page.locator('.hm-card__price').allTextContents()).map(price)
  expect(prices).toHaveLength(16)
  expect([...prices].sort((a, b) => a - b)).toEqual(prices)
  await expect(cards.first()).toHaveAttribute('href', '/zestawy/skrzat')
  await expect(cards.last()).toHaveAttribute('href', '/zestawy/perun')
  expect(await page.locator('.hm-card__fps').count()).toBe(
    await page.locator('.hm-card__fps .src').count(),
  )
})

test('the games panel switches game and resolution', async ({ page }) => {
  await page.goto('/')
  const chips = page.getByRole('group', { name: 'Gra' })
  const panel = page.locator('.hm-games__panel')
  await expect(chips.getByRole('button')).toHaveCount(33)
  await expect(chips.getByRole('button', { name: 'Cyberpunk 2077' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(panel.getByRole('heading', { name: 'Cyberpunk 2077' })).toBeVisible()
  await expect(panel.getByRole('radio', { name: '2K' })).toHaveAttribute('aria-checked', 'true')
  await expect(panel.locator('.hm-games__row')).toHaveCount(9)
  await expect(panel.locator('.hm-games__row .src')).toHaveCount(9)

  const values = () => panel.locator('.hm-games__value b').allTextContents()
  const qhd = await values()
  await panel.getByRole('radio', { name: 'FullHD' }).click()
  await expect.poll(values).not.toEqual(qhd)

  await chips.getByRole('button', { name: 'Counter-Strike 2' }).click()
  await expect(panel.getByRole('heading', { name: 'Counter-Strike 2' })).toBeVisible()
  await expect(panel.getByRole('link', { name: 'Pełne wyniki dla tej gry' })).toHaveAttribute(
    'href',
    '/komputer-do/counter-strike-2',
  )
})

test('the sample certificate shows Wampir numbers with their source', async ({ page }) => {
  await page.goto('/')
  const doc = page.getByRole('figure', { name: 'Wzór metryki komputera Wampir' })
  await expect(doc).toContainText('Moc VII')
  await expect(doc).toContainText(/Klatki w 2K, (test niezależny|przeliczone z testów|szacunek)/)
  await expect(doc.locator('.hm-doc__fps p')).toHaveCount(3)
  await expect(doc).not.toContainText('[')
})

test('paths, cards and games scroll sideways on a phone', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout')
  await page.goto('/')
  for (const selector of ['.hm-paths__list', '.hm-best__grid', '.hm-games__chips']) {
    const row = page.locator(selector)
    await row.scrollIntoViewIfNeeded()
    const { scroll, client } = await row.evaluate((el) => ({
      scroll: el.scrollWidth,
      client: el.clientWidth,
    }))
    expect(scroll, selector).toBeGreaterThan(client)
  }
  // The page itself never scrolls sideways.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(414)
})
