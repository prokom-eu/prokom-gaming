import { expect, test, type Page } from '@playwright/test'

// SEO of spec. §23 / §27.8: robots.txt, sitemap, `noindex` of private pages, canonical without
// filters and JSON-LD that parses. Locally and in CI `SITE_ENV` is not production, so robots.txt
// shuts crawlers out and every page carries `noindex` — production differs only there.
const production = process.env.SITE_ENV === 'production'

/** Every JSON-LD block of the page, parsed (a parse error fails the test). */
async function jsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
  type Item = Record<string, unknown>
  return blocks.flatMap((b) => [JSON.parse(b) as Item | Item[]].flat())
}
const types = (items: Record<string, unknown>[]) => items.map((i) => i['@type'])

test.describe('seo', () => {
  test.skip(({ isMobile }) => isMobile, 'the same documents at 414')

  test('robots.txt and the sitemap', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toMatch(production ? /Sitemap: .*\/sitemap\.xml/ : /Disallow: \/\s*$/m)

    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
    const urls = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (m) => new URL(m[1] as string).pathname,
    )
    expect(urls).toEqual(
      expect.arrayContaining([
        '/',
        '/zestawy',
        '/zestawy/wampir',
        '/komputer-do/cyberpunk-2077',
        '/poradniki/rodzice',
        '/regulamin',
      ]),
    )
    expect(urls.filter((u) => u.startsWith('/zestawy/'))).toHaveLength(16)
    expect(urls.filter((u) => u.startsWith('/komputer-do/'))).toHaveLength(33)
    for (const hidden of ['/zapytanie', '/metryka', '/konto', '/admin']) {
      expect(urls.some((u) => u === hidden || u.startsWith(`${hidden}/`))).toBe(false)
    }
  })

  test('private pages are never indexed', async ({ page }) => {
    for (const path of ['/zapytanie?zestaw=wampir', '/metryka', '/konto/logowanie']) {
      await page.goto(path)
      await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute('content', /noindex/)
    }
  })

  test('filters keep the canonical address of the list', async ({ page }) => {
    await page.goto('/zestawy?monitor=2k&budzet=9-15')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/zestawy$/)
  })

  test('home: the brand and the one shop', async ({ page }) => {
    await page.goto('/')
    const items = await jsonLd(page)
    expect(types(items)).toEqual(
      expect.arrayContaining(['Organization', 'ComputerStore', 'WebSite']),
    )
    const site = items.find((i) => i['@type'] === 'WebSite')
    expect(site).toMatchObject({
      name: 'PRO-KOM Gaming',
      alternateName: 'PRO-KOM Gaming Rabka-Zdrój',
    })
    expect(JSON.stringify(items)).not.toMatch(/Zakopane/)
  })

  test('home: icons Google can read and the large link preview (runda v2 §1.1–1.2)', async ({
    page,
    request,
  }) => {
    const favicon = await request.get('/favicon.ico')
    expect(favicon.status()).toBe(200)
    expect(favicon.headers()['content-type']).toBe('image/x-icon')
    await page.goto('/')
    await expect(page.locator('link[rel="icon"][href^="/favicon.ico"]')).toHaveCount(1)
    for (const size of ['192x192', '512x512']) {
      const href = await page
        .locator(`link[rel="icon"][type="image/png"][sizes="${size}"]`)
        .getAttribute('href')
      const icon = await request.get(href ?? '')
      expect(icon.status(), size).toBe(200)
      expect(icon.headers()['content-type']).toBe('image/png')
    }
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    )
  })

  test('build page: product with an offer, breadcrumbs and FAQ; title of spec. §23', async ({
    page,
  }) => {
    await page.goto('/zestawy/wampir')
    await expect(page).toHaveTitle(
      /^Wampir — komputer do gier (FullHD|2K|4K), [\d\s]+ zł \| PRO-KOM Gaming$/,
    )
    const items = await jsonLd(page)
    expect(types(items)).toEqual(expect.arrayContaining(['Product', 'BreadcrumbList', 'FAQPage']))
    const product = items.find((i) => i['@type'] === 'Product') as { offers: { price: unknown } }
    expect(Number(product.offers.price)).toBeGreaterThan(0)
  })

  test('JSON-LD of the other page types', async ({ page }) => {
    const expected: [string, string[]][] = [
      ['/komputer-do/cyberpunk-2077', ['BreadcrumbList', 'FAQPage']],
      ['/pytania', ['FAQPage', 'BreadcrumbList']],
      ['/poradniki/rodzice', ['Article', 'BreadcrumbList']],
      ['/regulamin', ['BreadcrumbList']],
      ['/zestawy', ['BreadcrumbList']],
    ]
    for (const [path, want] of expected) {
      await page.goto(path)
      expect(types(await jsonLd(page)), path).toEqual(expect.arrayContaining(want))
    }
  })
})
