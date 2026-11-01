import { expect, test, type Page } from '@playwright/test'

// Spec. §27.7–§27.8 on every page of the sitemap (+ the private pages, which are not in it):
// no board placeholders like „[telefon]” in the visible text, no instalment offer, no Santander,
// and unique titles and descriptions (spec. §23). One viewport is enough: the text is the same.
const PRIVATE = ['/zapytanie', '/metryka', '/konto/logowanie', '/konto/rejestracja']

// The only allowed „raty”: the FAQ question answered „Na razie nie…” (spec. §27.7).
const ALLOWED_RATY = /Czy (mogę|da się) kupić na raty\?\s*Na razie nie[^.]*\./g
const INSTALMENTS = /\b(rat|rata|raty|ratach|ratami|ratalnie|ratalny|ratalna|ratalnej|ratalnego)\b/i

/** Text of the page as a reader gets it, closed `<details>` included, no scripts or styles. */
const pageText = (page: Page) =>
  page.evaluate(() => {
    const body = document.body.cloneNode(true) as HTMLElement
    body.querySelectorAll('script, style, noscript, template').forEach((n) => n.remove())
    // Elements glued together („raty?Na razie”) read as separate words.
    body.querySelectorAll('*').forEach((n) => n.append(' '))
    return (body.textContent ?? '').replace(/\s+/g, ' ')
  })

test.describe('content scan', () => {
  test.skip(({ isMobile }) => isMobile, 'the text is the same at 414')
  // ~60 pages; `next dev` compiles the first visit of each route.
  test.describe.configure({ timeout: 600_000 })

  test('no placeholders, no instalments, unique titles and descriptions', async ({
    page,
    request,
  }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    const fromSitemap = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (m) => new URL(m[1] as string).pathname,
    )
    expect(fromSitemap.length).toBeGreaterThan(50)

    const titles = new Map<string, string>()
    const descriptions = new Map<string, string>()
    const problems: string[] = []
    for (const path of [...fromSitemap, ...PRIVATE]) {
      const response = await page.goto(path)
      expect(response?.status(), path).toBe(200)
      const html = await page.content()
      const text = await pageText(page)

      const placeholder = /\[[^\]]{1,40}\]/.exec(text)
      if (placeholder) problems.push(`${path}: placeholder ${placeholder[0]}`)
      if (/santander/i.test(html)) problems.push(`${path}: Santander`)
      const instalment = INSTALMENTS.exec(text.replace(ALLOWED_RATY, ''))
      if (instalment) problems.push(`${path}: „${instalment[0]}”`)

      if (fromSitemap.includes(path)) {
        const title = await page.title()
        const description =
          (await page.locator('meta[name="description"]').getAttribute('content')) ?? ''
        if (!description) problems.push(`${path}: no description`)
        if (titles.has(title)) problems.push(`${path}: title as ${titles.get(title)}`)
        if (description && descriptions.has(description)) {
          problems.push(`${path}: description as ${descriptions.get(description)}`)
        }
        titles.set(title, path)
        descriptions.set(description, path)
      }
    }
    expect(problems).toEqual([])
  })
})
