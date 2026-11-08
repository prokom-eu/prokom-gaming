import { expect, test, type Page } from '@playwright/test'

/**
 * Motion of runda v3 E2 (PREMIUM §2.1–2.4, ADR-G014): reduced motion = end state with nothing
 * moving; the hero text and its buttons never animate; cards below the fold enter in a cascade;
 * the parallax planes of a scene load only on a desktop width.
 */

/** Animations running inside an element (CSS animations and transitions). */
const animationsIn = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => el.getAnimations({ subtree: true }).length)

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the home hero stands in its end state', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.hero')).toHaveAttribute('data-material', 'krew')
    expect(await animationsIn(page, '.hero')).toBe(0)
    await expect(page.locator('.hero__title .ch').first()).toHaveCSS('opacity', '1')
    await expect(page.locator('.hero__dawn')).toHaveCSS('opacity', '0')
  })

  test('the build page hero stands in its end state', async ({ page }) => {
    await page.goto('/zestawy/wampir')
    await expect(page.getByRole('heading', { level: 1, name: 'Wampir' })).toBeVisible()
    expect(await animationsIn(page, '.bp-hero')).toBe(0)
    await expect(page.locator('.bp-hero__dawn')).toHaveCSS('opacity', '0')
  })

  test('no card is ever hidden for an entry', async ({ page }) => {
    await page.goto('/zestawy')
    await page.mouse.wheel(0, 2000)
    await expect(page.locator('.bl-grid > li[data-reveal="wait"]')).toHaveCount(0)
    for (const li of await page.locator('.bl-grid > li').all())
      await expect(li).toHaveCSS('opacity', '1')
  })
})

test('the hero text and its buttons never move: readable and clickable at once', async ({
  page,
}) => {
  await page.goto('/')
  // Read as soon as the markup is there: the entry is still running around the copy.
  expect(await animationsIn(page, '.hero__copy')).toBe(0)
  await expect(page.locator('.hero__copy h1')).toHaveCSS('opacity', '1')
  await expect(page.getByRole('link', { name: 'Dobierz komputer' }).first()).toBeEnabled()
})

test('the build page name is read once, as a word', async ({ page }) => {
  await page.goto('/zestawy/wampir')
  await expect(page.getByRole('heading', { level: 1, name: 'Wampir' })).toBeVisible()
  await expect(page.locator('.bp-title__name [aria-hidden="true"] .ch')).toHaveCount(6)
})

test('cards below the fold wait, then enter in a cascade of at most 6', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'one column on a phone: checked on desktop')
  await page.goto('/zestawy')
  const items = page.locator('.bl-grid > li')
  await expect(items.first()).toHaveAttribute('data-reveal', 'in')
  await expect(items.last()).toHaveAttribute('data-reveal', 'wait')
  await items.last().scrollIntoViewIfNeeded()
  await expect(items.last()).toHaveAttribute('data-reveal', 'in')
  const slots = await items.evaluateAll((els) =>
    els.map((el) => Number((el as HTMLElement).style.getPropertyValue('--reveal-i') || 0)),
  )
  expect(Math.max(...slots)).toBeLessThanOrEqual(5)
})

test('scene planes load on a desktop width, one flat picture on a phone', async ({
  browser,
  isMobile,
  viewport,
  baseURL,
}) => {
  // A real phone's screen is as wide as its viewport; the project's desktop device profile says
  // 1920, and the browser's preload scanner picks the <source> by the screen.
  const context = await browser.newContext({
    baseURL,
    viewport,
    isMobile,
    ...(isMobile && viewport ? { screen: viewport, hasTouch: true, deviceScaleFactor: 2 } : {}),
  })
  const page = await context.newPage()
  const scenes: string[] = []
  page.on('request', (request) => {
    const match = decodeURIComponent(request.url()).match(/scenes\/(wampir-[a-z]+)\.webp/)
    if (match?.[1]) scenes.push(match[1])
  })
  await page.goto('/zestawy/wampir', { waitUntil: 'load' })
  if (isMobile) {
    expect(scenes).toContain('wampir-hero')
    expect(scenes).not.toContain('wampir-back')
    expect(scenes).not.toContain('wampir-near')
  } else {
    expect(scenes).toEqual(expect.arrayContaining(['wampir-back', 'wampir-near']))
    expect(scenes).not.toContain('wampir-hero')
  }
  await context.close()
})
