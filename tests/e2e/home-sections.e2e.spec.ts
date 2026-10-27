import { expect, test } from '@playwright/test'

/**
 * Home sections 3–13 (G8, spec. §4 pt 3–13): order of the sections, 16 creature cards in price
 * order with a source next to every FPS number, the games panel switching game and resolution,
 * the comparator preview, the home questions, and the rows that scroll sideways on a phone
 * (ADR-G003 §4). Reviews (pt 8) stay hidden until real ones exist.
 */

const SECTIONS = [
  'Od czego zaczynasz?',
  'Szesnaście istot. Każda gra po swojemu.',
  'Jak kupić, skoro nie ma przycisku „Kup”',
  'W co grasz?',
  'Zanim komputer wyjedzie z Rabki',
  'Kupujesz komputer dla dziecka?',
  'Baba Jaga czy Wampir?',
  'W cenie każdego komputera',
  'Zanim zapytasz',
  'Napisz, w co grasz',
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

test('the comparator preview: three creatures, every number with its source', async ({ page }) => {
  await page.goto('/')
  const chart = page.locator('.hm-cmp__chart')
  await expect(chart.locator('strong')).toHaveText(['Kikimora', 'Baba Jaga', 'Wampir'])
  await expect(chart.locator('b')).toHaveText([/^\d+ FPS$/, /^\d+ FPS$/, /^\d+ FPS$/])
  await expect(chart.locator('.src')).toHaveCount(3)
  await expect(chart.locator('em').nth(2)).toHaveText(/^\+\d+% klatek$/)
  await expect(chart.locator('figcaption')).toContainText('Cyberpunk 2077, 2K')
  await expect(page.getByRole('link', { name: 'Otwórz porównywarkę' })).toHaveAttribute(
    'href',
    '/porownaj',
  )
})

test('six home questions, the first open, the others open with the keyboard', async ({ page }) => {
  await page.goto('/')
  const faq = page.locator('.hm-faq details')
  await expect(faq).toHaveCount(6)
  await expect(faq.first()).toHaveAttribute('open', '')
  await expect(faq.nth(1)).not.toHaveAttribute('open', '')
  const summary = faq.nth(1).locator('summary')
  await summary.scrollIntoViewIfNeeded()
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(faq.nth(1)).toHaveAttribute('open', '')
})

test('closing call: 16 sigils and both buttons, no placeholders in the sections', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.hm-fin__sigils li')).toHaveCount(16)
  await expect(page.getByRole('link', { name: 'Dobierz komputer' }).last()).toHaveAttribute(
    'href',
    '/konfigurator',
  )
  await expect(page.getByRole('link', { name: 'Zadaj pytanie' })).toHaveAttribute(
    'href',
    '/kontakt',
  )
  // No board placeholders like "[imię serwisanta]" or "[liczba]" and no instalment offer.
  const text = (await page.locator('.hm-sec').allTextContents()).join(' ')
  expect(text).not.toMatch(/\[[^\]]+\]/)
  expect(text).not.toMatch(/\braty\b|rata\b|Santander/i)
})
