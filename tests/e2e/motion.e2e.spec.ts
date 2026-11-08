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

/* ------- runda v3 E3: sections, numbers, configurator, micro-interactions, transitions ------- */

/** The values the `Count`s show right now: their registered integer `--count-n`. */
const shownCount = (page: Page, selector: string) =>
  page
    .locator(selector)
    .evaluateAll((els) =>
      els.map((el) => Number(getComputedStyle(el).getPropertyValue('--count-n'))),
    )

/** Holds the build page of Wampir back, so the navigation to it is slow. */
const slowWampir = (page: Page) =>
  page.route('**/zestawy/wampir**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    await route.continue()
  })

test.describe('reduced motion (E3)', () => {
  test.use({ reducedMotion: 'reduce' })

  test('home sections: nothing waits, numbers stand at their value', async ({ page }) => {
    await page.goto('/')
    const chart = page.locator('.hm-cmp__chart')
    await chart.scrollIntoViewIfNeeded()
    await expect(page.locator('[data-reveal="wait"]')).toHaveCount(0)
    await expect(chart).not.toHaveAttribute('data-shown', 'false')
    const values = (await chart.locator('.count__v').allTextContents()).map(Number)
    expect(values).toHaveLength(3)
    expect(await shownCount(page, '.hm-cmp__chart .count')).toEqual(values)
  })

  test('configurator: a new step and a new price come without motion', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/konfigurator')
    await page
      .locator('.cf-nav')
      .getByRole('button', { name: /^Dalej/ })
      .click()
    expect(await animationsIn(page, '.cf-pane')).toBe(0)
    if (!isMobile) await expect(page.locator('.cf-sb__p .roll')).not.toHaveClass(/is-flash/)
  })

  test('the slow-page sigil stands still', async ({ page }) => {
    await page.goto('/zestawy')
    await slowWampir(page)
    await page.locator('a[href="/zestawy/wampir"]').first().click()
    const mark = page.locator('.nav-pending__mark')
    await expect(mark).toBeVisible()
    await expect(mark).toHaveCSS('opacity', '1')
  })
})

test('a number counts from zero when its block enters the view; the DOM keeps the value', async ({
  page,
}) => {
  await page.goto('/')
  const chart = page.locator('.hm-cmp__chart')
  await expect(chart).toHaveAttribute('data-shown', 'false')
  // Waiting below the fold: the counter shows 0, screen readers and tests read the real number.
  expect(await shownCount(page, '.hm-cmp__chart .count')).toEqual([0, 0, 0])
  const values = (await chart.locator('.count__v').allTextContents()).map(Number)
  expect(values.every((v) => v > 0)).toBe(true)
  await chart.scrollIntoViewIfNeeded()
  await expect(chart).toHaveAttribute('data-shown', 'true')
  await expect.poll(() => shownCount(page, '.hm-cmp__chart .count')).toEqual(values)
})

test('section headings and the sigil arc wait below the fold, then enter once', async ({
  page,
}) => {
  await page.goto('/')
  const heading = page.locator('#inc-title')
  await expect(heading).toHaveAttribute('data-reveal', 'wait')
  // Jumping over unrendered sections (content-visibility) can land it in the last 8% of the
  // screen: scroll on until it enters, like a finger would.
  await expect(async () => {
    await heading.scrollIntoViewIfNeeded()
    await page.mouse.wheel(0, 120)
    await expect(heading).toHaveAttribute('data-reveal', 'in', { timeout: 1000 })
  }).toPass()
  const arc = page.locator('.hm-fin__sigils')
  await expect(async () => {
    await arc.scrollIntoViewIfNeeded()
    await page.mouse.wheel(0, 120)
    await expect(arc).toHaveAttribute('data-reveal', 'in', { timeout: 1000 })
  }).toPass()
  // The arc lights up once: no endless glow is left running on the sigils.
  const endless = () =>
    arc.evaluate(
      (el) =>
        el
          .getAnimations({ subtree: true })
          .filter((a) => a.effect?.getComputedTiming().iterations === Infinity).length,
    )
  await expect.poll(endless).toBe(0)
})

test('configurator: the step slides in, the price rolls to the published value', async ({
  page,
  isMobile,
}) => {
  await page.goto('/zestawy/wampir')
  await page.getByRole('link', { name: 'Zmień części' }).click()
  await expect(page).toHaveURL(/\/konfigurator\?/, { timeout: 30_000 })
  await page.getByRole('button', { name: /Pamięć i dysk/ }).click()
  expect(await animationsIn(page, '.cf-pane')).toBeGreaterThan(0)
  const roll = page.locator(isMobile ? '.cf-mbar .roll' : '.cf-sb__p .roll')
  const before = (await roll.locator('.count__v').textContent()) ?? ''
  await page.getByRole('button', { name: /^64 GB/ }).click()
  // The DOM text is final at once (a live region reads it once); the digits on screen follow.
  await expect(roll.locator('.count__v')).not.toHaveText(before)
  const final = await roll.locator('.count__v').textContent()
  await expect(roll).toHaveClass(/is-flash/)
  await expect.poll(() => roll.locator('.roll__d').getAttribute('data-v')).toBe(final)
})

test('adding a build: the counter jumps (and on a desktop a dot flies to it)', async ({
  page,
  isMobile,
}) => {
  await page.goto('/porownaj?z=baba-jaga,wampir')
  const badge = page.locator('.nav [data-fly="compare"] .badge')
  await expect(badge).toHaveText('2')
  // Opening the page is not an addition.
  await expect(badge).not.toHaveClass(/is-bump/)
  await page.getByRole('button', { name: /Dodaj trzeci komputer/ }).click()
  if (!isMobile) await expect(page.locator('.fly-dot')).toHaveCount(1)
  await expect(badge).toHaveText('3')
  await expect(badge).toHaveClass(/is-bump/)
  await expect(page.locator('.fly-dot')).toHaveCount(0)
})

test('list → build page runs one View Transition; the slow-page sigil stays away', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const start = document.startViewTransition?.bind(document)
    if (!start) return
    const w = window as unknown as { vtCount: number }
    w.vtCount = 0
    document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
      w.vtCount += 1
      return start(arg)
    }) as typeof document.startViewTransition
  })
  await page.goto('/zestawy')
  await page.locator('a[href="/zestawy/wampir"]').first().click()
  await expect(page.getByRole('heading', { level: 1, name: 'Wampir' })).toBeVisible({
    timeout: 30_000,
  })
  const count = await page.evaluate(() => (window as unknown as { vtCount: number }).vtCount)
  expect(count).toBe(1)
  await expect(page.locator('.nav-pending')).toHaveCount(0)
})

test('a slow page change shows the sigil of the creature you are going to', async ({ page }) => {
  await page.goto('/zestawy')
  await slowWampir(page)
  await page.locator('a[href="/zestawy/wampir"]').first().click()
  const pending = page.locator('.nav-pending')
  await expect(pending).toBeVisible()
  await expect(page.locator('.nav-pending__live')).toHaveText('Wczytuję stronę…')
  await expect(pending.locator('.sigil')).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1, name: 'Wampir' })).toBeVisible({
    timeout: 30_000,
  })
  await expect(pending).toHaveCount(0)
})

test('a gold button leans towards the cursor, at most 4 px', async ({ page, isMobile }) => {
  test.skip(isMobile, 'a mouse on a desktop only')
  await page.goto('/')
  const button = page.locator('.hero .btn').first()
  const box = (await button.boundingBox())!
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2)
  await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2)
  // The cursor sits at the right edge: the button follows it to the right, no further than 4 px.
  const pullX = () =>
    button.evaluate((el) => parseFloat(getComputedStyle(el).translate.split(' ')[0] ?? '0') || 0)
  await expect.poll(pullX).toBeGreaterThan(2)
  expect(await pullX()).toBeLessThanOrEqual(4)
})

test('home sections: every finite animation ends (none stuck in an unrendered section)', async ({
  page,
}) => {
  await page.goto('/')
  // The sections below the hero only (the hero keeps changing creatures on its own timer).
  const stuck = await page.evaluate(async () => {
    const running = document
      .getAnimations()
      .filter((a) => a.timeline instanceof DocumentTimeline)
      .filter((a) => a.effect?.getTiming().iterations !== Infinity)
      .filter((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target
        return target instanceof Element && target.closest('.hm-sec') !== null
      })
    await Promise.race([
      Promise.all(running.map((a) => a.finished.catch(() => undefined))),
      new Promise((resolve) => setTimeout(resolve, 15_000)),
    ])
    return running
      .filter((a) => a.playState === 'running' || a.playState === 'paused')
      .map((a) => {
        const name =
          a instanceof CSSAnimation
            ? a.animationName
            : a instanceof CSSTransition
              ? a.transitionProperty
              : a.id
        const target = (a.effect as KeyframeEffect | null)?.target
        return `${name} on ${target instanceof Element ? target.className : '?'}`
      })
  })
  expect(stuck).toEqual([])
})

test('the counting property leaves the comparison tables alone (their own --n)', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'the tables turn into grids on a phone')
  await page.goto('/porownaj?z=baba-jaga,wampir,weles&gra=cyberpunk-2077&rozdz=2k&hz=144')
  const row = page.locator('.cmp-table--matrix tbody tr').first()
  const columns = await row.evaluate((el) => getComputedStyle(el).gridTemplateColumns)
  expect(columns.split(' ')).toHaveLength(3)
})

test('the skip link (a hash, same page) never shows the slow-page sigil', async ({ page }) => {
  await page.goto('/zestawy')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#tresc$/)
  await page.waitForTimeout(600)
  await expect(page.locator('.nav-pending')).toHaveCount(0)
})
