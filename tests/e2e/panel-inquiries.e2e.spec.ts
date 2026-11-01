import { createHmac, randomInt } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

import { CONSENT_CLAUSE } from '../../src/lib/inquiry/consent'
import { ADMIN_STATE, adminHeaders } from './helpers/adminSession'

/**
 * /admin/zapytania (P3, panel spec §4, ADR-G008): a reply from the panel reaches the customer as
 * an e-mail with `[PKG-…]` in the subject, our Message-ID answering the confirmation and the
 * signature exactly once; the status moves; an offer template marks `offer_sent`; a note never
 * goes out; „Zamień w zamówienie” creates the order. Writes inquiries, messages and orders, so it
 * runs with the database writers; the phone variant (414) sends one reply from the thread screen.
 */

test.describe.configure({ mode: 'serial' })
test.use({ storageState: ADMIN_STATE })

const MAILPIT =
  process.env.MAILPIT_URL ?? `http://127.0.0.1:${Number(process.env.SMTP_PORT ?? 1026) + 7000}`
const randomIp = () => `10.${randomInt(0, 256)}.${randomInt(0, 256)}.${randomInt(1, 255)}`
const ip = randomIp()
// The form's limit counts per address: the „Nieprzypisane” tests send from their own.
const ipUnmatched = randomIp()
const run = `${Date.now().toString(36)}${randomInt(0, 1000)}`

function formToken(): string {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is not set.')
  const issuedAt = Date.now() - 5_000
  const signature = createHmac('sha256', secret)
    .update(`inquiry-form:${issuedAt}`)
    .digest('base64url')
  return `${issuedAt}.${signature}`
}

type Mail = { ID: string; Subject: string }
type Stored = { id: number; status: string; confirmationMessageId: string | null }

let api: APIRequestContext
let headers: Record<string, string>

test.beforeAll(async ({ playwright, baseURL }) => {
  api = await playwright.request.newContext({ baseURL })
  headers = adminHeaders()
})

test.afterAll(async () => {
  await api.dispose()
})

/** A build inquiry from the site, with its own name and address. */
async function newInquiry(
  tag: string,
  from = ip,
): Promise<{ number: string; email: string; name: string }> {
  const email = `p3-${tag}-${run}@example.test`
  const name = `Klient ${tag} ${run}`
  const res = await api.post('/api/inquiry', {
    headers: { 'x-real-ip': from },
    data: {
      type: 'build',
      build: 'bies',
      name,
      email,
      preferredContact: 'email',
      message: `Wiadomość ${tag}`,
      consent: { accepted: true, clauseVersion: CONSENT_CLAUSE.version },
      source: { url: 'http://localhost:3100/zestawy/bies' },
      formToken: formToken(),
    },
  })
  expect(res.status(), await res.text()).toBe(201)
  const { number } = (await res.json()) as { number: string }
  return { number, email, name }
}

async function stored(number: string): Promise<Stored> {
  const res = await api.get(
    `/api/inquiries?where[number][equals]=${encodeURIComponent(number)}&depth=0`,
    { headers },
  )
  return ((await res.json()) as { docs: Stored[] }).docs[0] as Stored
}

async function mailsTo(address: string): Promise<Mail[]> {
  const res = await api.get(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`)
  return ((await res.json()) as { messages: Mail[] }).messages
}

async function replyMail(address: string, number: string): Promise<Mail> {
  let found: Mail | undefined
  await expect
    .poll(
      async () => {
        found = (await mailsTo(address)).find((m) => m.Subject.startsWith(`Re: [${number}]`))
        return Boolean(found)
      },
      { timeout: 15_000 },
    )
    .toBe(true)
  return found as Mail
}

async function openThread(page: Page, number: string) {
  await page.goto(`/admin/zapytania?nr=${encodeURIComponent(number)}`)
  await expect(page.getByRole('heading', { level: 2, name: 'Bies' })).toBeVisible()
  // The reply box is hydrated (typing earlier would not reach React under `next dev`).
  await expect(page.locator('form.pn-cmp[data-ready]')).toBeVisible()
}

async function send(page: Page) {
  await page.getByRole('button', { name: 'Wyślij' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Wysłano.' })).toBeVisible({
    timeout: 20_000,
  })
}

test.describe('computer', () => {
  test.skip(({ isMobile }) => isMobile, 'the phone variant is below')

  test('a reply from a template: mail with [PKG-…], signature once, thread and status', async ({
    page,
  }) => {
    const { number, email } = await newInquiry('odp')
    await openThread(page, number)
    await expect(page.getByText('Wysłano automatyczne potwierdzenie z numerem')).toBeVisible()
    const axe = await new AxeBuilder({ page })
      .include('[data-panel]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(
      axe.violations.map((v) => ({ rule: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([])

    await page.getByRole('button', { name: 'Potwierdzenie i termin' }).click()
    await expect(page.getByLabel('Odpowiedź', { exact: true })).toHaveValue(new RegExp(number))
    await send(page)

    // The thread and the status after the page reloaded its data.
    await expect(page.locator('.pn-msg--out')).toContainText(`dziękuję za zapytanie ${number}`)
    await expect(page.getByRole('radio', { name: 'W toku' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    const record = await stored(number)
    expect(record.status).toBe('in_progress')

    // The e-mail: subject with the number, the signature exactly once, threading headers.
    const { signature } = (await (
      await api.get('/api/globals/mail-settings', { headers })
    ).json()) as { signature: string }
    const mail = await replyMail(email, number)
    expect(mail.Subject).toBe(`Re: [${number}] Bies`)
    const body = (await (await api.get(`${MAILPIT}/api/v1/message/${mail.ID}`)).json()) as {
      Text: string
    }
    const firstLine = signature.split('\n')[0] as string
    expect(body.Text.split(firstLine).length - 1).toBe(1)
    const head = (await (
      await api.get(`${MAILPIT}/api/v1/message/${mail.ID}/headers`)
    ).json()) as Record<string, string[]>
    expect(head['Message-Id']?.[0]).toMatch(/^<[^@]+@[^>]+>$/)
    if (record.confirmationMessageId) {
      expect(head['In-Reply-To']?.[0]).toBe(record.confirmationMessageId)
    }
  })

  test('the offer template marks „Oferta wysłana”; a note never goes out', async ({ page }) => {
    const { number, email } = await newInquiry('ofe')
    await openThread(page, number)

    await page.getByLabel('Odpowiedź', { exact: true }).fill('Notatka: zadzwonić jutro.')
    await page.getByRole('button', { name: 'Notatka wewnętrzna' }).click()
    // The action saves and the thread renders again: several seconds under `next dev` (G15).
    await expect(page.locator('.pn-msg--note')).toContainText('Notatka: zadzwonić jutro.', {
      timeout: 20_000,
    })
    expect(await stored(number)).toMatchObject({ status: 'new' })

    await page.getByRole('button', { name: 'Oferta z listą części' }).click()
    const draft = page.getByLabel('Odpowiedź', { exact: true })
    await expect(draft).toHaveValue(/Skład:\n• /)
    await expect(draft).not.toHaveValue(/\{(nr|zestaw|cena|czesci|termin|podpis)\}/)
    await send(page)
    expect(await stored(number)).toMatchObject({ status: 'offer_sent' })

    // Only the offer reached the customer — the note did not.
    await replyMail(email, number)
    const replies = (await mailsTo(email)).filter((m) => m.Subject.startsWith('Re: '))
    expect(replies).toHaveLength(1)
  })

  test('„Zamień w zamówienie” creates the order once and marks the inquiry', async ({ page }) => {
    const { number } = await newInquiry('zam')
    await openThread(page, number)
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Zamień w zamówienie' }).click()
    await expect(page.getByText(/Zamówienie Z-\d{4}-\d{4}/)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Zamień w zamówienie' })).toHaveCount(0)
    const record = await stored(number)
    expect(record.status).toBe('won')
    const orders = (await (
      await api.get(`/api/orders?where[inquiry][equals]=${record.id}&depth=0`, { headers })
    ).json()) as { totalDocs: number; docs: { price: number | null }[] }
    expect(orders.totalDocs).toBe(1)
    expect(orders.docs[0]?.price).toBeGreaterThan(0)
  })

  test('the status switch and „Oznacz: bez zakupu” save the status; ordering stays possible', async ({
    page,
  }) => {
    const { number } = await newInquiry('sta')
    await openThread(page, number)
    await page.getByRole('radio', { name: 'Zamówienie' }).click()
    await expect(page.getByRole('radio', { name: 'Zamówienie' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(await stored(number)).toMatchObject({ status: 'won' })
    // Set by hand, without an order: the order can still be created.
    await expect(page.getByRole('button', { name: 'Zamień w zamówienie' })).toBeVisible()

    await page.getByRole('radio', { name: 'W toku' }).click()
    await expect(page.getByRole('radio', { name: 'W toku' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await page.getByRole('button', { name: 'Oznacz: bez zakupu' }).click()
    await expect(page.getByRole('radio', { name: 'Bez zakupu' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(await stored(number)).toMatchObject({ status: 'lost' })
    await expect(page.getByRole('button', { name: 'Oznacz: bez zakupu' })).toHaveCount(0)
  })

  test('search by name goes by POST — the name never lands in the address', async ({ page }) => {
    const { number, name } = await newInquiry('szu')
    await page.goto('/admin/zapytania')
    await expect(page.locator('form.pn-cmp[data-ready]')).toBeVisible()
    await page.getByRole('searchbox').fill(name)
    const hit = page.getByRole('region', { name: 'Wyniki wyszukiwania' }).getByRole('link')
    await expect(hit.first()).toContainText(number)
    expect(page.url()).not.toContain(encodeURIComponent(name.split(' ')[0] as string))
    await hit.first().click()
    await expect(page).toHaveURL(new RegExp(`nr=${number}`))
  })
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone only')

  test('list → thread full screen → reply from the box at the bottom', async ({ page }) => {
    const { number, email } = await newInquiry('tel')
    await page.goto('/admin/zapytania?filtr=nowe')
    // Two screens: the list first, no thread.
    await expect(page.locator('.pn-ibm')).toBeHidden()
    await page.getByRole('link', { name: new RegExp(`Klient tel ${run}`) }).click()
    await expect(page).toHaveURL(new RegExp(`nr=${number}`))
    await expect(page.getByRole('heading', { level: 2, name: 'Bies' })).toBeVisible()
    await expect(page.locator('form.pn-cmp[data-ready]')).toBeVisible()
    // Full screen: no bottom tabs, the back link returns to the list with its filter.
    await expect(page.getByRole('navigation', { name: 'Panel, nawigacja dolna' })).toBeHidden()
    await expect(page.getByRole('link', { name: 'Wróć do listy zapytań' })).toHaveAttribute(
      'href',
      '/admin/zapytania?filtr=nowe',
    )
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scroll).toBeLessThanOrEqual(414)

    await page
      .getByLabel('Odpowiedź', { exact: true })
      .fill(`Dzień dobry,\n\nodpowiedź z telefonu ${run}.`)
    await send(page)
    expect(await stored(number)).toMatchObject({ status: 'in_progress' })
    await replyMail(email, number)
  })
})

/**
 * „Nieprzypisane” (P4, ADR-G008 pt 3): a mail from the mailbox that matched no inquiry is attached
 * by number (it lands in the thread as the customer's answer, marked „inny nadawca” when the
 * address differs) or rejected. The intake job itself is tested on a fake mailbox (Vitest) —
 * Mailpit has no IMAP — so the test adds the unmatched record through the admin REST API.
 */
async function newUnmatched(tag: string): Promise<{ id: number; subject: string; body: string }> {
  const subject = `Pytanie bez numeru ${tag} ${run}`
  const body = `Treść z poczty ${tag} ${run}.`
  const res = await api.post('/api/mail-intake-unmatched', {
    headers,
    data: {
      from: `inny-${tag}-${run}@example.test`,
      subject,
      receivedAt: new Date().toISOString(),
      body,
      attachmentsInfo: 'zdjecie.jpg (120 KB)',
      status: 'new',
    },
  })
  expect(res.status(), await res.text()).toBe(201)
  return { id: ((await res.json()) as { doc: { id: number } }).doc.id, subject, body }
}

async function attachByNumber(page: Page, number: string) {
  await page.getByLabel('Numer zapytania').fill(number.toLowerCase())
  await page.getByRole('button', { name: 'Przypnij do zapytania' }).click()
  await expect(page).toHaveURL(new RegExp(`nr=${number}`), { timeout: 20_000 })
}

async function threadInMessages(number: string) {
  const { id } = await stored(number)
  const res = await api.get(
    `/api/inquiry-messages?where[inquiry][equals]=${id}&where[direction][equals]=in&depth=0`,
    { headers },
  )
  return (await res.json()) as { docs: { body: string; otherSender: string | null }[] }
}

test.describe('unmatched mail — computer', () => {
  test.skip(({ isMobile }) => isMobile, 'the phone variant is below')

  test('attach by number: into the thread as „inny nadawca”, unread cleared on opening', async ({
    page,
  }) => {
    const { number } = await newInquiry('unm', ipUnmatched)
    const mail = await newUnmatched('pc')
    await page.goto(`/admin/zapytania?filtr=nieprzypisane&wiad=${mail.id}`)
    await expect(page.getByRole('link', { name: /Nieprzypisane/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await expect(page.getByRole('heading', { level: 2, name: mail.subject })).toBeVisible()
    await expect(page.locator('.pn-msg--in')).toContainText('Załącznik w poczcie: zdjecie.jpg')
    // The address is in the panel only — never in the URL.
    expect(page.url()).not.toContain('example.test')
    const axe = await new AxeBuilder({ page })
      .include('[data-panel]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(
      axe.violations.map((v) => ({ rule: v.id, targets: v.nodes.map((n) => n.target) })),
    ).toEqual([])

    await attachByNumber(page, number)
    await expect(page.locator('.pn-msg--in').last()).toContainText(mail.body)
    await expect(page.locator('.pn-msg--in').last()).toContainText('inny nadawca')
    const { docs } = await threadInMessages(number)
    expect(docs).toHaveLength(1)
    expect(docs[0]?.otherSender).toBe(`inny-pc-${run}@example.test`)
    // Opening the thread with ?nr= marked the answer as read.
    const res = await api.get(
      `/api/inquiries?where[number][equals]=${encodeURIComponent(number)}&depth=0`,
      { headers },
    )
    expect(((await res.json()) as { docs: { unreadCount: number }[] }).docs[0]?.unreadCount).toBe(0)
  })

  test('a wrong number is refused; „Odrzuć” takes the message off the list', async ({ page }) => {
    const mail = await newUnmatched('odrz')
    await page.goto(`/admin/zapytania?filtr=nieprzypisane&wiad=${mail.id}`)
    await page.getByLabel('Numer zapytania').fill('PKG-1999-9999')
    await page.getByRole('button', { name: 'Przypnij do zapytania' }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'Nie ma zapytania PKG-1999-9999.' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Odrzuć' }).click()
    await expect(page).toHaveURL(/filtr=nieprzypisane$/, { timeout: 20_000 })
    await expect(page.locator('.pn-ibl').getByText(mail.subject)).toHaveCount(0)
    // Its old address now says it was handled.
    await page.goto(`/admin/zapytania?filtr=nieprzypisane&wiad=${mail.id}`)
    await expect(page.getByText('Tej wiadomości już nie ma albo została obsłużona.')).toBeVisible()
  })

  test('Settings say whether customers’ answers are read (IMAP off here)', async ({ page }) => {
    await page.goto('/admin/ustawienia')
    const row = page.locator('.pn-kv').filter({ hasText: 'Odpowiedzi klientów' })
    await expect(row).toContainText(
      process.env.IMAP_HOST ? 'pobierane co 2 min (IMAP)' : 'odbiór wyłączony — brak ustawień IMAP',
    )
  })
})

test.describe('unmatched mail — phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone only')

  test('list → message full screen → attach from the bottom box', async ({ page }) => {
    const { number } = await newInquiry('unmtel', ipUnmatched)
    const mail = await newUnmatched('tel')
    await page.goto('/admin/zapytania?filtr=nieprzypisane')
    await expect(page.locator('.pn-ibm')).toBeHidden()
    await page.getByRole('link', { name: new RegExp(mail.subject) }).click()
    await expect(page.getByRole('heading', { level: 2, name: mail.subject })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Panel, nawigacja dolna' })).toBeHidden()
    const field = page.getByLabel('Numer zapytania')
    expect(await field.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px')
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scroll).toBeLessThanOrEqual(414)
    await attachByNumber(page, number)
    await expect(page.locator('.pn-msg--in').last()).toContainText(mail.body)
  })
})
