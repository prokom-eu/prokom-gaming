import { expect, test } from '@playwright/test'

// Runda v2 §8: no sideways scroll on a phone from 360 to 414 px. The other specs check 414
// (the project width); 360 is the narrowest phone we support, so every sitemap page is checked
// there once. Found in R9: monitor tiles on the build page („bez kompromisów”) at 360 and 390.
// Blind spot: home sections use `content-visibility: auto` (paint containment), so content
// spilling out of them is clipped on screen and does not show up in scrollWidth.
test.describe('narrow phone (360 px)', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone layout')
  test.setTimeout(300_000)

  test('no page from the sitemap scrolls sideways', async ({ page, request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
    expect(paths.length).toBeGreaterThan(10)

    await page.setViewportSize({ width: 360, height: 780 })
    const wide: string[] = []
    for (const path of paths) {
      await page.goto(path)
      await page.evaluate(() => document.fonts.ready.then(() => true))
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      if (overflow > 0) wide.push(`${path} +${overflow}px`)
    }
    expect(wide).toEqual([])
  })
})
