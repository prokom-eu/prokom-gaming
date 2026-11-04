import { expect, test } from '@playwright/test'

// Link previews (runda v2 §1.2): every page of the sitemap has an og:image that opens — a PNG of
// 1200×630 — so a link pasted on Facebook, Messenger or WhatsApp shows a picture.
test.describe('og:image', () => {
  test.skip(({ isMobile }) => isMobile, 'the same documents at 414')

  /** Width and height from a PNG's IHDR chunk (bytes 16–23, big-endian). */
  const pngSize = (body: Buffer) => ({
    width: body.readUInt32BE(16),
    height: body.readUInt32BE(20),
  })

  test('every page of the sitemap has a 1200×630 preview', async ({ request }) => {
    // ~65 pages, each image drawn on request (the dev server compiles every route once).
    test.setTimeout(600_000)
    const sitemap = await (await request.get('/sitemap.xml')).text()
    const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (m) => new URL(m[1] as string).pathname,
    )
    expect(paths.length).toBeGreaterThan(50)

    const broken: string[] = []
    for (const path of paths) {
      const html = await (await request.get(path)).text()
      const content = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1]
      if (!content) {
        broken.push(`${path}: no og:image`)
        continue
      }
      // The meta tag carries SITE_URL's host; the test server may run elsewhere.
      const image = new URL(content.replace(/&amp;/g, '&'))
      const res = await request.get(image.pathname + image.search)
      const body = await res.body()
      const size = res.ok() ? pngSize(body) : null
      if (
        res.status() !== 200 ||
        res.headers()['content-type'] !== 'image/png' ||
        size?.width !== 1200 ||
        size?.height !== 630
      ) {
        broken.push(
          `${path}: ${res.status()} ${res.headers()['content-type']} ${JSON.stringify(size)}`,
        )
      }
      expect(html, path).toContain('<meta name="twitter:card" content="summary_large_image"/>')
    }
    expect(broken).toEqual([])
  })
})
