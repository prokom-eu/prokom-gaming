import { randomInt } from 'node:crypto'

import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Content pages of G13 at 1440 and 414 (spec. §16–§21): every page renders its board heading
 * without sideways scrolling, the FAQ groups switch and carry `FAQPage`, the contact form ends
 * with a `contact` record and two e-mails, the legal texts come from the panel with their table
 * of contents, and guide drafts never reach the site. axe of these pages: `a11y.e2e.spec.ts`.
 */

const MAILPIT =
  process.env.MAILPIT_URL ?? `http://127.0.0.1:${Number(process.env.SMTP_PORT ?? 1026) + 7000}`

const PAGES = [
  { path: '/pytania', h1: 'Pytania i odpowiedzi' },
  { path: '/kontakt', h1: 'Napisz, zadzwoń albo wpadnij do sklepu' },
  { path: '/dla-rodzicow', h1: 'Komputer dla dziecka bez stresu i bez żargonu' },
  { path: '/o-nas', h1: 'Składamy komputery w Rabce-Zdroju od 2004 roku' },
  { path: '/regulamin', h1: 'Regulamin i zwroty' },
  { path: '/polityka-prywatnosci', h1: 'Polityka prywatności i cookies' },
  { path: '/poradniki', h1: 'Poradniki' },
  { path: '/poradniki/rodzice', h1: 'Jak kupić komputer do gier dla dziecka i nie przepłacić' },
]

/** JSON-LD blocks of the page, parsed. */
async function jsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
  return blocks.flatMap((text) => {
    const data = JSON.parse(text) as Record<string, unknown> | Record<string, unknown>[]
    return Array.isArray(data) ? data : [data]
  })
}

for (const { path, h1 } of PAGES) {
  test(`${path} renders without sideways scrolling`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    // No bracketed placeholder of the boards in the page (spec. §27.7: zero square brackets).
    expect(await page.locator('main').innerText()).not.toMatch(/\[[^\]\n]{2,}\]/)
    expect(await page.content()).not.toContain('[imię serwisanta]')
  })
}

test('/pytania: 5 groups, switching, FAQPage with every question', async ({ page }) => {
  await page.goto('/pytania')
  const groups = page.getByRole('group', { name: 'Grupy pytań' }).getByRole('button')
  await expect(groups).toHaveCount(5)
  await expect(page.getByRole('heading', { level: 2, name: 'Zakup i płatność' })).toBeVisible()

  await groups.filter({ hasText: 'Dla rodziców' }).click()
  await expect(groups.filter({ hasText: 'Dla rodziców' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('heading', { level: 2, name: 'Dla rodziców' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Zakup i płatność' })).toBeHidden()

  const faq = (await jsonLd(page)).find((d) => d['@type'] === 'FAQPage')
  expect((faq?.mainEntity as unknown[]).length).toBe(21)
})

/** The saved record, read with the seed admin (inquiries are panel-only). */
async function inquiryByNumber(request: APIRequestContext, number: string) {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set.')
  const login = await request.post('/api/users/login', { data: { email, password } })
  const headers = { Authorization: `JWT ${((await login.json()) as { token: string }).token}` }
  const res = await request.get(
    `/api/inquiries?where[number][equals]=${encodeURIComponent(number)}&depth=0`,
    { headers },
  )
  const { docs } = (await res.json()) as {
    docs: { type: string; message: string; consent: { clauseVersion: string } }[]
  }
  expect(docs).toHaveLength(1)
  return docs[0]!
}

async function subjectsTo(request: APIRequestContext, address: string): Promise<string[]> {
  const res = await request.get(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`,
  )
  return ((await res.json()) as { messages: { Subject: string }[] }).messages.map((m) => m.Subject)
}

test('/kontakt: „Krótkie pytanie?” → board messages, then a contact record, number, 2 e-mails', async ({
  page,
  request,
}, testInfo) => {
  // Own address per test: the limit of inquiries is per IP (X-Real-IP, ADR-G005).
  await page.setExtraHTTPHeaders({ 'x-real-ip': `198.51.100.${randomInt(1, 254)}` })
  await page.goto('/kontakt')
  const openedAt = Date.now()
  const send = page.getByRole('button', { name: 'Wyślij wiadomość' })

  await send.click()
  for (const message of [
    'Wpisz imię.',
    'Wpisz e-mail, na który odpiszemy.',
    'Napisz kilka słów, w czym możemy pomóc.',
    'Zaznacz zgodę, żebyśmy mogli odpisać.',
  ]) {
    await expect(page.getByText(message)).toBeVisible()
  }

  const email = `kontakt-${Date.now().toString(36)}-${testInfo.project.name}@example.test`
  await page.getByLabel('Imię').fill('Test e2e')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Wiadomość').fill('Czy wysyłacie do Krakowa?')
  await page.getByRole('checkbox', { name: /Zgadzam się na kontakt/ }).check()
  // The signed token must be at least 3 s old (ADR-G005).
  await page.waitForTimeout(Math.max(0, 3_500 - (Date.now() - openedAt)))
  await send.click()

  const status = page.getByRole('status')
  await expect(status).toContainText('Wiadomość wysłana', { timeout: 30_000 })
  await expect(status).toContainText(`Odpiszemy na ${email}`)
  const number = (await status.locator('strong').textContent()) ?? ''
  expect(number).toMatch(/^PKG-\d{4}-\d{4,}$/)

  const record = await inquiryByNumber(request, number)
  expect(record).toMatchObject({
    type: 'contact',
    message: 'Czy wysyłacie do Krakowa?',
    consent: { clauseVersion: '2026-10-30-kontakt' },
  })
  await expect
    .poll(() => subjectsTo(request, email), { timeout: 20_000 })
    .toContain(`Otrzymaliśmy Twoje zapytanie ${number} — PRO-KOM Gaming`)
  const inbox = process.env.INQUIRY_NOTIFY_EMAIL
  if (inbox) {
    await expect
      .poll(async () => (await subjectsTo(request, inbox)).some((s) => s.includes(number)), {
        timeout: 20_000,
      })
      .toBe(true)
  }
})

test('legal pages: content from the panel, numbered table of contents, draft notice', async ({
  page,
}) => {
  await page.goto('/regulamin')
  const toc = page.getByRole('navigation', { name: 'Spis treści' }).getByRole('link')
  await expect(toc).toHaveCount(11)
  await expect(page.getByText('Projekt do weryfikacji przez prawnika.')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: '§ 5 Zwrot w 14 dni' })).toBeVisible()
  // No ODR platform and no instalments (spec. §21).
  // Whole words only (spec. §27.7: „utraty” is fine).
  expect(await page.locator('main').innerText()).not.toMatch(
    /(^|[^\p{L}])rat(y|ach|alnej)?([^\p{L}]|$)/iu,
  )

  // The footer's „Ustawienia cookies” lands on the cookies paragraph.
  await page.goto('/polityka-prywatnosci#cookies')
  await expect(page.locator('#cookies')).toBeVisible()
  await expect(page.locator('.ct-table table')).toHaveCount(2)
})

test('guides: only published ones are listed, a draft is 404, the guide has Article JSON-LD', async ({
  page,
  request,
}) => {
  await page.goto('/poradniki')
  await expect(page.locator('.ct-guide')).toHaveCount(1)
  await expect(page.getByText('Jaki komputer do Fortnite w 2026 roku')).toHaveCount(0)

  expect((await request.get('/poradniki/fortnite')).status()).toBe(404)
  const api = (await (await request.get('/api/guides?draft=true&depth=0')).json()) as {
    docs: { slug: string }[]
  }
  expect(api.docs.map((d) => d.slug)).toEqual(['rodzice'])
  // Versions (drafts included) are panel-only (`readVersions`).
  expect((await request.get('/api/guides/versions?depth=0')).status()).toBe(403)

  await page.locator('.ct-guide').first().click()
  await expect(page).toHaveURL(/\/poradniki\/rodzice$/)
  await expect(page.getByText('Ściągawka:')).toBeVisible()
  await expect(page.getByRole('link', { name: /Skrzat/ })).toHaveAttribute(
    'href',
    '/zestawy/skrzat',
  )
  const article = (await jsonLd(page)).find((d) => d['@type'] === 'Article')
  expect(article?.headline).toBe('Jak kupić komputer do gier dla dziecka i nie przepłacić')
})

test('/dla-rodzicow: the only mention of instalments is „Na razie nie…” (spec. §27.7)', async ({
  page,
}) => {
  await page.goto('/dla-rodzicow')
  const question = page.locator('details', { hasText: 'Czy da się kupić na raty?' })
  await question.locator('summary').click()
  await expect(question).toContainText('Na razie nie prowadzimy sprzedaży ratalnej.')
  await expect(page.getByRole('link', { name: 'biała lista VAT' })).toHaveAttribute(
    'href',
    /podatki\.gov\.pl/,
  )
})
