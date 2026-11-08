import { expect, test, type Page } from '@playwright/test'

import buildsSeed from '../../seed/prokomgaming/builds.json' with { type: 'json' }

/**
 * The computer on its stand (runda v2 §3.1, §3.3):
 * - hero of the home page and of every build page: the creature's name stays wholly above the case,
 *   ≥ 12 px clear, for all 16 creatures at 1920 / 1440 / 1280 / 1100 / 390 px;
 * - cards („Wszystkie zestawy”, „Szesnaście istot”): the case stands on the middle of the pedestal
 *   (≤ 4 px off) and wholly inside the picture.
 *
 * The case is its real outline (`media.box`, the non-transparent pixels), not the file. The name is
 * the letters: left / right / top from `Range.getClientRects`, the bottom from the font's baseline
 * plus the glyphs' own descent (canvas `measureText`) — the range's box alone reaches ~0.35 em
 * below the letters, empty space where no glyph is (decision Krystian 06.11).
 */

const HERO_WIDTHS = [1920, 1440, 1280, 1100, 390]
const CARD_WIDTHS = [1440, 390]
const GAP = 12
const SLUGS = buildsSeed.items.map((b) => b.slug)

type Rect = { left: number; right: number; top: number; bottom: number }

// Desktop project only: the widths are set here, one browser run covers them all.
test.skip(({ isMobile }) => isMobile, 'every width is set inside the test')
// No entry animation, parallax or automatic switch: the hero holds still while it is measured.
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

async function settle(page: Page, photo: string) {
  await page.evaluate(() => document.fonts.ready)
  await page.locator(photo).evaluate((img: HTMLImageElement) => img.decode())
}

/** Letters of the name and the case's outline, in viewport pixels. */
function measureHero(page: Page, nameSel: string, photoSel: string) {
  return page.evaluate(
    ([nameSel, photoSel]) => {
      const name = document.querySelector(nameSel) as HTMLElement
      const img = document.querySelector(photoSel) as HTMLImageElement
      const range = document.createRange()
      range.selectNodeContents(name)
      const rects = [...range.getClientRects()]
      const cs = getComputedStyle(name)
      const ctx = document.createElement('canvas').getContext('2d')!
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const m = ctx.measureText((name.textContent ?? '').toUpperCase())
      const last = rects[rects.length - 1]
      const letters = {
        left: Math.min(...rects.map((r) => r.left)),
        right: Math.max(...rects.map((r) => r.right)),
        top: rects[0].top,
        bottom: last.top + m.fontBoundingBoxAscent + m.actualBoundingBoxDescent,
      }
      const caseEl = img.closest('.case') as HTMLElement
      const v = (n: string) => parseFloat(getComputedStyle(caseEl).getPropertyValue(n))
      const r = img.getBoundingClientRect()
      const box = {
        left: r.left + v('--bx') * r.width,
        right: r.left + (v('--bx') + v('--bw')) * r.width,
        top: r.top + v('--by') * r.height,
        bottom: r.top + (v('--by') + v('--bh')) * r.height,
      }
      return { name: name.textContent ?? '', letters, box }
    },
    [nameSel, photoSel] as const,
  )
}

function expectClear(m: { name: string; letters: Rect; box: Rect }, width: number) {
  const overlapX = m.letters.left < m.box.right && m.box.left < m.letters.right
  const gap = m.box.top - m.letters.bottom
  if (overlapX) {
    expect(
      gap,
      `${m.name} at ${width}px: case ${Math.round(gap)} px under the letters`,
    ).toBeGreaterThanOrEqual(GAP)
  }
}

for (const width of HERO_WIDTHS) {
  test(`home hero at ${width}px: every name above its computer`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
    await page.goto('/')
    await expect(page.locator('.hero')).toHaveAttribute('data-material', 'krew') // hydrated
    const tiers = page.getByRole('navigation', { name: 'Poziomy mocy' }).getByRole('button')
    const switcher = page
      .getByRole('group', { name: 'Komputery na tym poziomie mocy' })
      .getByRole('button')
    const seen = new Set<string>()
    for (let i = 0; i < (await tiers.count()); i++) {
      await tiers.nth(i).click()
      const siblings = Math.max(await switcher.count(), 1)
      for (let j = 0; j < siblings; j++) {
        if ((await switcher.count()) > 0) {
          await switcher.nth(j).click()
          await expect(switcher.nth(j)).toHaveAttribute('aria-pressed', 'true')
        }
        const photo = '.hero__photo[data-on="true"] img'
        await settle(page, photo)
        const m = await measureHero(page, '.hero__name', photo)
        seen.add(m.name)
        expectClear(m, width)
      }
    }
    expect(seen.size).toBe(SLUGS.length)
  })

  test(`build pages at ${width}px: every name above its computer`, async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
    for (const slug of SLUGS) {
      await page.goto(`/zestawy/${slug}`)
      const photo = '.bp-stage__photo img'
      await settle(page, photo)
      expectClear(await measureHero(page, '.bp-title__name', photo), width)
    }
  })
}

/** Pedestal of the card scenes (1680×960, the same in all 16): centre x 1125, top face y 713. */
function measureCards(page: Page, sel: { card: string; art: string; scene: string }) {
  return page.evaluate((sel) => {
    return [...document.querySelectorAll(sel.card)].map((card) => {
      const art = card.querySelector(sel.art)!.getBoundingClientRect()
      const scene = card.querySelector(sel.scene) as HTMLImageElement
      const sr = scene.getBoundingClientRect()
      // `.bl-card__scene`: object-fit cover at 67% / bottom; `.hm-card__scene`: drawn whole.
      const cover = getComputedStyle(scene).objectFit === 'cover'
      const s = cover ? Math.max(sr.width / 1680, sr.height / 960) : sr.height / 960
      const left = cover ? sr.left + (sr.width - 1680 * s) * 0.67 : sr.left
      const pedestalX = left + 1125 * s
      const caseEl = card.querySelector('.case') as HTMLElement
      const img = caseEl.querySelector('img')!.getBoundingClientRect()
      const v = (n: string) => parseFloat(getComputedStyle(caseEl).getPropertyValue(n))
      const box = {
        left: img.left + v('--bx') * img.width,
        right: img.left + (v('--bx') + v('--bw')) * img.width,
        top: img.top + v('--by') * img.height,
        bottom: img.top + (v('--by') + v('--bh')) * img.height,
      }
      return {
        href: card.querySelector('a')?.getAttribute('href') ?? card.getAttribute('href'),
        art: { left: art.left, right: art.right, top: art.top, bottom: art.bottom },
        box,
        pedestalX,
      }
    })
  }, sel)
}

const CARD_LISTS = [
  { url: '/zestawy', card: '.bl-card', art: '.bl-card__art', scene: '.bl-card__scene' },
  { url: '/', card: '.hm-card', art: '.hm-card__view', scene: '.hm-card__scene' },
]

for (const width of CARD_WIDTHS) {
  for (const list of CARD_LISTS) {
    test(`${list.url} cards at ${width}px: case on the middle of the pedestal, inside the picture`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(list.url)
      const images = page.locator(`${list.card} .case img`)
      await expect(images).toHaveCount(SLUGS.length)
      // Lazy images: bring each into view and wait until it is decoded.
      for (let i = 0; i < SLUGS.length; i++) {
        await images.nth(i).scrollIntoViewIfNeeded()
        await images.nth(i).evaluate((img: HTMLImageElement) => img.decode())
      }
      for (const c of await measureCards(page, list)) {
        const centre = (c.box.left + c.box.right) / 2
        expect(Math.abs(centre - c.pedestalX), `${c.href}: off the pedestal`).toBeLessThanOrEqual(4)
        expect(c.box.top, `${c.href}: cut at the top`).toBeGreaterThanOrEqual(c.art.top)
        expect(c.box.left, `${c.href}: cut at the left`).toBeGreaterThanOrEqual(c.art.left)
        expect(c.box.right, `${c.href}: cut at the right`).toBeLessThanOrEqual(c.art.right)
        expect(c.box.bottom, `${c.href}: below the picture`).toBeLessThanOrEqual(c.art.bottom)
      }
    })
  }
}
