import { randomInt } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

import { expectNoHiddenOffer, panelInternalModels } from './helpers/hiddenOffer'

/**
 * The inquiry form end to end (spec. §10, G12) at 1440 and 414: three ways in — a build, a
 * configuration, „Pomóżcie mi dobrać” — each ends with a record in the database, two e-mails in
 * Mailpit and the number on `/zapytanie/wyslane`.
 */

// Mailpit's web API: CI maps SMTP 1025 → UI 8025, local compose 1026 → 8026 (CLAUDE.md).
const MAILPIT =
  process.env.MAILPIT_URL ?? `http://127.0.0.1:${Number(process.env.SMTP_PORT ?? 1026) + 7000}`
const run = Date.now().toString(36)

type Inquiry = {
  number: string
  type: string
  lightColor?: string | null
  config?: { ram?: string | null; level?: string | null }
  forWhom?: string | null
  budget?: string | null
  monitor?: string | null
  message?: string | null
  marketingConsent?: boolean
}

/** The saved record, read with the seed admin (inquiries are panel-only). */
async function inquiryByNumber(request: APIRequestContext, number: string): Promise<Inquiry> {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set.')
  const login = await request.post('/api/users/login', { data: { email, password } })
  const headers = { Authorization: `JWT ${((await login.json()) as { token: string }).token}` }
  const res = await request.get(
    `/api/inquiries?where[number][equals]=${encodeURIComponent(number)}&depth=0`,
    { headers },
  )
  const { docs } = (await res.json()) as { docs: Inquiry[] }
  expect(docs).toHaveLength(1)
  return docs[0] as Inquiry
}

/** axe (WCAG 2.1 A/AA) on the current state of the page — rule ids and targets on failure. */
async function expectNoAxeViolations(page: Page) {
  // The step fades in (and pills change colour): measure contrast once it has settled.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'))
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(violations.map((v) => ({ rule: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual([])
}

async function subjectsTo(request: APIRequestContext, address: string): Promise<string[]> {
  const res = await request.get(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`,
  )
  return ((await res.json()) as { messages: { Subject: string }[] }).messages.map((m) => m.Subject)
}

/** Both e-mails of an inquiry arrived (they go out right after the answer, `after()`). */
async function expectEmails(request: APIRequestContext, customer: string, number: string) {
  await expect
    .poll(() => subjectsTo(request, customer), { timeout: 20_000 })
    .toContain(`Otrzymaliśmy Twoje zapytanie ${number} — PRO-KOM Gaming`)
  const inbox = process.env.INQUIRY_NOTIFY_EMAIL
  if (inbox) {
    await expect
      .poll(
        async () =>
          (await subjectsTo(request, inbox)).some((s) => s.startsWith(`Zapytanie ${number}`)),
        { timeout: 20_000 },
      )
      .toBe(true)
  }
}

/**
 * Opens the form from its own address: Nginx sets X-Real-IP (G16), so every test has its own
 * limit of 5 inquiries per 10 minutes and repeated runs do not run into it.
 */
async function open(page: Page, path: string): Promise<number> {
  await page.setExtraHTTPHeaders({
    'x-real-ip': `10.${randomInt(0, 256)}.${randomInt(0, 256)}.${randomInt(1, 255)}`,
  })
  await page.goto(path)
  await expect(page.getByRole('heading', { level: 1, name: 'Zapytanie o komputer' })).toBeVisible()
  return Date.now()
}

const next = (page: Page, label: string) => page.getByRole('button', { name: label }).click()

async function fillContact(page: Page, email: string) {
  await page.getByLabel('Imię').fill('Test e2e')
  await page.getByLabel('E-mail').fill(email)
  await page.getByRole('checkbox', { name: /Zgadzam się na kontakt/ }).check()
}

/** Sends once the signed token is old enough (ADR-G005: at least 3 s after the page was shown). */
async function send(page: Page, openedAt: number): Promise<string> {
  await page.waitForTimeout(Math.max(0, 3_500 - (Date.now() - openedAt)))
  await page.getByRole('button', { name: 'Wyślij zapytanie' }).click()
  await page.waitForURL(/\/zapytanie\/wyslane\?nr=PKG-/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { level: 1, name: 'Zapytanie wysłane' })).toBeVisible()
  const number = new URL(page.url()).searchParams.get('nr') ?? ''
  expect(number).toMatch(/^PKG-\d{4}-\d{4,}$/)
  await expect(page.getByText(`Numer zapytania: ${number}`)).toBeVisible()
  // The inquiry counter in the shell is back to zero.
  expect(await page.evaluate(() => localStorage.getItem('pkg:inquiry'))).toBe('[]')
  return number
}

test('from a build page: changes and light colour reach the record, both e-mails', async ({
  page,
  request,
}, testInfo) => {
  const customer = `e2e-form-build-${run}-${testInfo.project.name}@example.test`
  const openedAt = await open(page, '/zapytanie?zestaw=wampir&ram=R64&swiatlo=lod')

  const summary = page.locator('.iq-sum')
  await expect(summary).toContainText('Wampir')
  await expect(summary).toContainText('światło Lód')
  await expect(page.getByRole('button', { name: /Wampir/, pressed: true })).toBeVisible()

  await next(page, 'Dalej: gry i wygląd')
  await expect(page.getByRole('heading', { level: 2, name: 'W co grasz i na czym?' })).toBeFocused()
  await page.getByRole('button', { name: 'Cyberpunk 2077', exact: true }).click()
  await page.getByRole('button', { name: '2K', exact: true }).click()
  await expect(summary).toContainText('Cyberpunk 2077')
  await expectNoAxeViolations(page)

  await next(page, 'Dalej: kontakt')
  // Leaving the contact step empty shows the board's messages.
  await next(page, 'Dalej: sprawdź')
  await expect(
    page.getByText('Wpisz imię, żebyśmy wiedzieli, jak się do Ciebie zwracać.'),
  ).toBeVisible()
  await expect(page.getByText('Wpisz e-mail, na który wyślemy ofertę.')).toBeVisible()
  await expect(page.getByText('Zaznacz zgodę, żebyśmy mogli odpisać z ofertą.')).toBeVisible()
  await expectNoAxeViolations(page)
  await page.getByLabel('E-mail').fill('jan@')
  await page.getByLabel('Imię').fill('x')
  await next(page, 'Dalej: sprawdź')
  await expect(page.getByText(/Ten e-mail wygląda na niepełny/)).toBeVisible()
  await fillContact(page, customer)

  await next(page, 'Dalej: sprawdź')
  const review = page.locator('.iq-review')
  await expect(review).toContainText('Wampir, Moc VII, 4K, pamięć')
  await expect(review).toContainText('światło Lód')
  await expect(review).toContainText(customer)
  await expectNoAxeViolations(page)

  const number = await send(page, openedAt)
  expect(new URL(page.url()).searchParams.get('istota')).toBe('wampir')
  await expect(page.locator('.iq-card')).toContainText('Twoja konfiguracja')
  await expect(page.locator('.iq-card')).toContainText('kurier, w cenie')
  await expectNoAxeViolations(page)

  const saved = await inquiryByNumber(request, number)
  expect(saved).toMatchObject({ type: 'build', lightColor: 'lod', monitor: 'qhd' })
  expect(saved.config?.ram).toBe('R64')
  await expectEmails(request, customer, number)
})

test('from the configurator: five codes and the other part in the notes', async ({
  page,
  request,
}, testInfo) => {
  const customer = `e2e-form-config-${run}-${testInfo.project.name}@example.test`
  const openedAt = await open(page, '/zapytanie?k=P13.LB500.PL3LX.R32.NM1&inne=Fractal%20North')
  await expect(page.getByText(/^Z konfiguratora: Wampir, konfiguracja/)).toBeVisible()

  await next(page, 'Dalej: gry i wygląd')
  await next(page, 'Dalej: kontakt')
  await expect(page.getByLabel(/Coś jeszcze/)).toHaveValue(
    'Obudowa albo chłodzenie spoza listy: Fractal North',
  )
  await fillContact(page, customer)
  await next(page, 'Dalej: sprawdź')
  const number = await send(page, openedAt)

  const saved = await inquiryByNumber(request, number)
  expect(saved).toMatchObject({ type: 'config' })
  expect(saved.config?.level).toBe('P13')
  expect(saved.message).toContain('Fractal North')
  await expectEmails(request, customer, number)
})

test('„Pomóżcie mi dobrać”: for whom and budget, no computer', async ({
  page,
  request,
}, testInfo) => {
  const customer = `e2e-form-advice-${run}-${testInfo.project.name}@example.test`
  const openedAt = await open(page, '/zapytanie')

  await page.getByRole('button', { name: /Pomóżcie mi dobrać/ }).click()
  await page.getByRole('button', { name: 'Dla dziecka', exact: true }).click()
  await page.getByRole('button', { name: '6–9 tys. zł', exact: true }).click()
  await expect(page.locator('.iq-sum')).toContainText('Dobór komputera')

  await next(page, 'Dalej: gry i wygląd')
  await page.getByRole('button', { name: 'Minecraft', exact: true }).click()
  await next(page, 'Dalej: kontakt')
  await fillContact(page, customer)
  await page.getByRole('checkbox', { name: /informacje o nowościach/ }).check()
  await next(page, 'Dalej: sprawdź')
  await expect(page.locator('.iq-review')).toContainText('Dobór. Dla dziecka, budżet 6–9 tys. zł')

  const number = await send(page, openedAt)
  expect(new URL(page.url()).searchParams.get('istota')).toBeNull()

  const saved = await inquiryByNumber(request, number)
  expect(saved).toMatchObject({
    type: 'advice',
    forWhom: 'child',
    budget: '6k_9k',
    marketingConsent: true,
  })
  await expectEmails(request, customer, number)
})

test.describe('entries and the draft', () => {
  // Pure page behaviour: one width is enough.
  test.skip(({ isMobile }) => isMobile, 'desktop only')

  test('a comparison asks about the first build and names the others in the notes', async ({
    page,
  }) => {
    await open(page, '/zapytanie?z=baba-jaga,wampir,weles')
    await expect(page.locator('.iq-sum')).toContainText('Baba Jaga')
    await next(page, 'Dalej: gry i wygląd')
    await next(page, 'Dalej: kontakt')
    await expect(page.getByLabel(/Coś jeszcze/)).toHaveValue(
      'Z porównania: Baba Jaga, Wampir, Weles.',
    )
  })

  test('step 1 asks for a computer; the picked one comes back on a return visit', async ({
    page,
  }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('pkg:inquiry'))
    await open(page, '/zapytanie')
    await next(page, 'Dalej: gry i wygląd')
    await expect(
      page.getByText('Wybierz komputer albo zaznacz wyżej „Pomóżcie mi dobrać”.'),
    ).toBeVisible()

    await page.getByRole('button', { name: /Weles/ }).click()
    expect(await page.evaluate(() => localStorage.getItem('pkg:inquiry'))).toBe('["zestaw=weles"]')

    await page.goto('/zapytanie')
    await page.waitForURL(/\/zapytanie\?zestaw=weles/, { timeout: 20_000 })
    await expect(page.getByRole('button', { name: /Weles/, pressed: true })).toBeVisible()
  })

  test('the page data carry no internal model or cost (ADR-G002 §8.7)', async ({
    page,
    playwright,
    baseURL,
  }) => {
    const models = await panelInternalModels(playwright, baseURL)
    const response = await page.goto('/zapytanie?zestaw=wampir')
    expectNoHiddenOffer((await response?.text()) ?? '', models)
  })

  test('the sent page without a valid number goes back to the form', async ({ page }) => {
    await page.goto('/zapytanie/wyslane?nr=../../etc')
    await expect(page).toHaveURL(/\/zapytanie$/)
  })
})
