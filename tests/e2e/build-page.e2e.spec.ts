import { expect, test, type Page } from '@playwright/test'

import pricingExpected from '../fixtures/pricing-expected.json' with { type: 'json' }
import { expectNoHiddenOffer, panelInternalModels } from './helpers/hiddenOffer'

/**
 * Build page (G9 PR 2, spec. §6, boards Zestaw / Zestaw-telefon, `stany/tel-05`, `tel-06`): the
 * sections in spec order, the published price on all 16 pages (= fixtures), the interior plan by
 * keyboard, „Dopasuj” pricing and the inquiry link, the sticky bar on both widths, the path from
 * the list to the inquiry, 404 for an unknown build and no cost or internal model in the page.
 */

const price = (text: string | null) => Number((text ?? '').replace(/\D/g, ''))
const wampir = pricingExpected.builds.find((b) => b.slug === 'wampir')!

const SECTIONS = [
  'Dlaczego Wampir?',
  'Ile klatek w Twojej grze',
  'Co jest w środku Wampira',
  'Dopasuj Wampira pod siebie',
  'Od zapytania do Twojego biurka',
  'Co znajdziesz w pudełku',
  'Gwarancja i opieka',
  'Inne istoty w pobliżu',
  'Pytania o Wampira',
]

test('Wampir: name, sections in spec order, structured data', async ({ page }) => {
  await page.goto('/zestawy/wampir')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wampir')
  // Without spaces: „Co znajdziesz<br>w pudełku” has none between the lines in its text.
  const squash = (text: string) => text.replace(/\s+/g, '')
  const headings = await page.locator('main h2').allTextContents()
  const found = SECTIONS.map((title) => headings.map(squash).indexOf(squash(title)))
  expect(
    found.every((i) => i >= 0),
    headings.join(' | '),
  ).toBe(true)
  expect([...found].sort((a, b) => a - b)).toEqual(found)

  const ld = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? '[]',
  ) as { '@type': string; offers?: { price: number } }[]
  expect(ld.map((x) => x['@type'])).toEqual(['Product', 'BreadcrumbList', 'FAQPage'])
  expect(ld[0]!.offers?.price).toBe(wampir.price)
  // Nine questions from `faq` (group `build`), the first one open.
  await expect(page.locator('.bp-faq details')).toHaveCount(9)
  await expect(page.locator('.bp-faq details').first()).toHaveAttribute('open', '')
})

test.describe('all 16 builds', () => {
  test.skip(({ isMobile }) => isMobile, 'prices are the same on both widths')

  // Money: every page shows the published price (= fixtures) in the price box, the bar and the offer.
  test('show the fixture price', async ({ page }) => {
    // 16 pages that read the offer and the FPS table: ~4 s each under `next dev` (G15).
    test.slow()
    for (const build of pricingExpected.builds) {
      // `next dev` may reload a page while it compiles the next one: retry the navigation.
      await expect(async () => {
        const response = await page.goto(`/zestawy/${build.slug}`)
        expect(response?.status(), build.slug).toBe(200)
      }).toPass({ timeout: 60_000 })
      expect(price(await page.locator('.bp-price__p b').textContent()), build.slug).toBe(
        build.price,
      )
      expect(price(await page.locator('.bp-bar__p b').textContent()), build.slug).toBe(build.price)
    }
  })
})

test('an unknown build is a 404', async ({ page }) => {
  const response = await page.goto('/zestawy/nie-ma-takiej-istoty')
  expect(response?.status()).toBe(404)
})

test('the interior plan works by keyboard (aria-pressed, highlight)', async ({ page }) => {
  await page.goto('/zestawy/wampir')
  const parts = page.locator('.bp-part')
  await expect(parts).toHaveCount(8)
  await expect(parts.first()).toHaveAttribute('aria-pressed', 'true')
  await parts.nth(4).focus()
  await page.keyboard.press('Enter')
  await expect(parts.nth(4)).toHaveAttribute('aria-pressed', 'true')
  await expect(parts.first()).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.bp-plan__grid')).toHaveAttribute('data-part', '4')
  await expect(page.locator('.bp-plan__sel b')).toHaveText(/^1 TB NVMe/)
})

test('„Dopasuj” prices from the published batch and passes the version on', async ({ page }) => {
  await page.goto('/zestawy/wampir')
  const tune = page.locator('.bp-tune')
  const total = tune.locator('.bp-tune__price b')
  const ask = tune.getByRole('link', { name: 'Zapytaj o tę wersję' })
  expect(price(await total.textContent())).toBe(wampir.price)
  await expect(ask).toHaveAttribute('href', '/zapytanie?zestaw=wampir')

  // Surcharges = the board and the pricing sheet: 64 GB +3 190 zł, 2 TB +610 zł.
  await tune.getByRole('button', { name: /^64 GB/ }).click()
  await tune.getByRole('button', { name: /^2 TB/ }).click()
  await tune.getByRole('button', { name: 'Lód' }).click()
  await expect(total).toHaveText(/18\s?340 zł/)
  expect(price(await total.textContent())).toBe(wampir.price + 3190 + 610)
  await expect(ask).toHaveAttribute('href', '/zapytanie?zestaw=wampir&ram=R64&ssd=NM2&swiatlo=lod')
  await expect(tune.getByRole('button', { name: 'Lód' })).toHaveAttribute('aria-pressed', 'true')

  // Back to the recipe: the price and the link are the build's own again.
  await tune.getByRole('button', { name: /^32 GB/ }).click()
  await tune.getByRole('button', { name: /^1 TB/ }).click()
  await tune.getByRole('button', { name: 'Istoty' }).click()
  expect(price(await total.textContent())).toBe(wampir.price)
  await expect(ask).toHaveAttribute('href', '/zapytanie?zestaw=wampir')
})

async function barBox(page: Page) {
  return page.locator('.bp-bar').boundingBox()
}

test('the sticky bar stays in view (desktop: top; phone: above the tab bar)', async ({
  page,
  isMobile,
}) => {
  await page.goto('/zestawy/wampir')
  const bar = page.locator('.bp-bar')
  await expect(bar.getByRole('link', { name: 'Zapytaj o Wampira' })).toHaveAttribute(
    'href',
    '/zapytanie?zestaw=wampir',
  )
  await page.evaluate(() => window.scrollTo({ top: 3000 }))
  await expect(bar).toBeInViewport()
  if (isMobile) {
    const tabbar = await page.locator('.tabbar').boundingBox()
    await expect
      .poll(async () => {
        const box = await barBox(page)
        return box && tabbar ? Math.round(box.y + box.height - tabbar.y) : 999
      })
      .toBe(0)
  } else {
    await expect.poll(async () => Math.round((await barBox(page))?.y ?? -1)).toBe(0)
  }
})

test('from the list: filter → card → „Zapytaj” carries the build', async ({ page, isMobile }) => {
  await page.goto('/zestawy?monitor=4k')
  await page.getByRole('link', { name: 'Wampir', exact: true }).click()
  await expect(page).toHaveURL(/\/zestawy\/wampir$/)
  const ask = isMobile
    ? page.locator('.bp-bar').getByRole('link', { name: 'Zapytaj o Wampira' })
    : page.locator('.bp-price').getByRole('link', { name: 'Zapytaj o Wampira' })
  await expect(ask).toHaveAttribute('href', '/zapytanie?zestaw=wampir')
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone layout (≤ 760 px)')

  test('the page does not scroll sideways', async ({ page }) => {
    await page.goto('/zestawy/wampir')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
  })
})

test('the page carries no cost or internal model', async ({ page, playwright, baseURL }) => {
  const internalModels = await panelInternalModels(playwright, baseURL)
  const response = await page.goto('/zestawy/wampir')
  expect(response?.status()).toBe(200)
  expectNoHiddenOffer(await response!.text(), internalModels)
})
