import { expect, test } from '@playwright/test'

import buildsSeed from '../../seed/prokomgaming/builds.json' with { type: 'json' }

// „Wyróżnik” instead of „Z podań” (ADR-G013 pt 1, runda v2 §2): no folk-tale text and no link to
// its sources on any of the 16 build pages or under the names on /zestawy.
const SOURCES = /wikipedia|nationalgeographic|britannica|ceeol|teatrnn/i

test.describe('Wyróżnik', () => {
  test('16 build pages: „Wyróżnik” with its title, no „Z podań” and no source links', async ({
    page,
  }) => {
    test.setTimeout(240_000)
    for (const build of buildsSeed.items) {
      await page.goto(`/zestawy/${build.slug}`)
      const block = page.locator('.bp-hl')
      await expect(block, build.slug).toContainText('Wyróżnik')
      await expect(block.locator('.bp-hl__t'), build.slug).toHaveText(build.highlight.title)
      await expect(page.getByText('Z podań'), build.slug).toHaveCount(0)
      const hrefs = await page
        .locator('a[href]')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''))
      expect(
        hrefs.filter((h) => SOURCES.test(h)),
        build.slug,
      ).toEqual([])
    }
  })

  test('/zestawy: the highlight title under every name', async ({ page }) => {
    await page.goto('/zestawy')
    const lines = await page.locator('.bl-card__hl').allTextContents()
    expect(lines).toHaveLength(16)
    expect(lines).toEqual(expect.arrayContaining(buildsSeed.items.map((b) => b.highlight.title)))
    await expect(page.getByText('Domowy duszek z polskich podań')).toHaveCount(0)
  })
})
