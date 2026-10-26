import { createHmac, randomInt } from 'node:crypto'

import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

import { CONSENT_CLAUSE } from '../../src/lib/inquiry/consent'

/**
 * `POST /api/inquiry` end to end (ADR-G005, G6): a real record with a number, the price from the
 * server, both e-mails in Mailpit; refusals without saving; nothing public to read.
 */

// The API does not depend on the viewport: one project is enough.
test.skip(({ isMobile }) => isMobile, 'API test runs in the desktop project only')

// Mailpit's web API: CI maps SMTP 1025 → UI 8025, local compose 1026 → 8026 (CLAUDE.md).
const MAILPIT =
  process.env.MAILPIT_URL ?? `http://127.0.0.1:${Number(process.env.SMTP_PORT ?? 1026) + 7000}`

/** The token the form gets from the server (G12), issued 5 s ago — past the minimum fill time. */
function formToken(): string {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is not set.')
  const issuedAt = Date.now() - 5_000
  const signature = createHmac('sha256', secret)
    .update(`inquiry-form:${issuedAt}`)
    .digest('base64url')
  return `${issuedAt}.${signature}`
}

// Each run comes from its own address (Nginx sets X-Real-IP), so repeated local runs do not hit
// the limit of 5 inquiries per 10 minutes.
const ip = `198.51.100.${randomInt(1, 254)}`
const run = Date.now().toString(36)

const inquiry = (extra: Record<string, unknown> = {}) => ({
  type: 'build',
  build: 'bies',
  config: { ram: 'R32' },
  games: ['counter-strike-2', 'gra-ktorej-nie-ma'],
  monitor: 'qhd',
  refresh: '144',
  name: 'Test e2e',
  email: `e2e-${run}@example.test`,
  preferredContact: 'email',
  pickup: 'rabka',
  consent: { accepted: true, clauseVersion: CONSENT_CLAUSE.version },
  source: { url: 'http://localhost:3100/zapytanie?zestaw=bies', utmSource: 'e2e' },
  // Ignored by the server: the price is always recomputed.
  price: 1,
  formToken: formToken(),
  ...extra,
})

const post = (request: APIRequestContext, data: unknown) =>
  request.post('/api/inquiry', { data, headers: { 'x-real-ip': ip } })

type MailpitMessage = {
  ID: string
  Subject: string
  To: { Address: string }[]
  ReplyTo: { Address: string }[]
}

async function mailsTo(request: APIRequestContext, address: string): Promise<MailpitMessage[]> {
  const res = await request.get(
    `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`,
  )
  return ((await res.json()) as { messages: MailpitMessage[] }).messages
}

test('a build inquiry: 201 with a number, both e-mails, the next one gets the next number', async ({
  request,
}) => {
  const first = await post(request, inquiry())
  expect(first.status()).toBe(201)
  const { ok, number } = (await first.json()) as { ok: boolean; number: string }
  expect(ok).toBe(true)
  expect(number).toMatch(/^PKG-\d{4}-\d{4,}$/)

  // Confirmation to the customer: number, the changed build and its server price.
  const customer = `e2e-${run}@example.test`
  await expect
    .poll(async () => (await mailsTo(request, customer)).map((m) => m.Subject), { timeout: 15_000 })
    .toContain(`Otrzymaliśmy Twoje zapytanie ${number} — PRO-KOM Gaming`)

  // Notification to the Gaming inbox with Reply-To = customer (when the inbox is configured).
  const inbox = process.env.INQUIRY_NOTIFY_EMAIL
  if (inbox) {
    await expect
      .poll(
        async () => {
          const found = (await mailsTo(request, inbox)).find((m) =>
            m.Subject.startsWith(`Zapytanie ${number} — Gotowy zestaw`),
          )
          return found?.ReplyTo.map((r) => r.Address)
        },
        { timeout: 15_000 },
      )
      .toEqual([customer])
  }

  // Numbers follow each other within the year (counter in the insert's transaction).
  const second = await post(
    request,
    inquiry({ type: 'advice', build: undefined, config: undefined, forWhom: 'child' }),
  )
  expect(second.status()).toBe(201)
  const next = ((await second.json()) as { number: string }).number
  const seq = (n: string) => Number(n.split('-')[2])
  expect(next.slice(0, 8)).toBe(number.slice(0, 8))
  expect(seq(next)).toBe(seq(number) + 1)
})

test('refusals: wrong media type, broken JSON, too large, spam, invalid fields, incompatible', async ({
  request,
}) => {
  const asText = await request.post('/api/inquiry', {
    data: 'x',
    headers: { 'content-type': 'text/plain', 'x-real-ip': ip },
  })
  expect(asText.status()).toBe(415)

  const broken = await request.post('/api/inquiry', {
    data: '{oops',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
  })
  expect(broken.status()).toBe(400)

  const huge = await post(request, inquiry({ message: 'x'.repeat(40_000) }))
  expect(huge.status()).toBe(413)

  const honeypot = await post(request, inquiry({ website: 'http://spam.example' }))
  expect(honeypot.status()).toBe(400)
  expect(await honeypot.json()).toEqual({ error: 'rejected' })

  const noToken = await post(request, inquiry({ formToken: undefined }))
  expect(await noToken.json()).toEqual({ error: 'rejected' })

  // Field paths only, never the values.
  const invalid = await post(request, inquiry({ email: 'tajny-adres', invoice: 'company' }))
  expect(invalid.status()).toBe(400)
  const invalidBody = await invalid.text()
  expect(JSON.parse(invalidBody)).toEqual({ error: 'invalid', fields: ['email', 'nip'] })
  expect(invalidBody).not.toContain('tajny-adres')

  // Wampir's level with 16 GB RAM (fixtures scenario) — the server's compatibility rules decide.
  const incompatible = await post(
    request,
    inquiry({
      type: 'config',
      build: undefined,
      config: { level: 'P13', case: 'LB500', cooler: 'PL3LX', ram: 'R16', ssd: 'NM1' },
    }),
  )
  expect(incompatible.status()).toBe(400)
  expect(await incompatible.json()).toEqual({
    error: 'invalid',
    fields: ['config'],
    compat: ['ram_too_small'],
  })

  const unknownBuild = await post(request, inquiry({ build: 'smok' }))
  expect(await unknownBuild.json()).toEqual({ error: 'invalid', fields: ['build'] })

  // Bon and „Gotowe od ręki” wait for G13.
  const voucher = await post(
    request,
    inquiry({ type: 'voucher', build: undefined, config: undefined }),
  )
  expect(await voucher.json()).toMatchObject({ error: 'invalid', fields: ['type'] })
})

test('inquiries are not readable or writable through the public REST API', async ({ request }) => {
  expect((await request.get('/api/inquiries')).status()).toBe(403)
  expect((await request.get('/api/inquiry-deletions')).status()).toBe(403)
  const create = await request.post('/api/inquiries', {
    data: { type: 'contact', name: 'x', email: 'x@example.test' },
  })
  expect(create.status()).toBe(403)
  expect((await request.get('/api/inquiry')).status()).toBe(405)
})

test('panel: only the status changes; deleting leaves a trail without the content', async ({
  playwright,
  baseURL,
  request,
}) => {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set.')
  // Own context: the login cookie must not reach the anonymous requests.
  const panel = await playwright.request.newContext({ baseURL })
  const login = await panel.post('/api/users/login', { data: { email, password } })
  expect(login.status()).toBe(200)
  const headers = { Authorization: `JWT ${((await login.json()) as { token: string }).token}` }

  const created = await post(
    request,
    inquiry({ type: 'contact', build: undefined, config: undefined, message: 'Pytanie e2e' }),
  )
  expect(created.status()).toBe(201)
  const { number } = (await created.json()) as { number: string }
  const found = (await (
    await panel.get(`/api/inquiries?where[number][equals]=${number}&depth=0`, { headers })
  ).json()) as { docs: { id: number; statusChangedAt: string; name: string }[] }
  const doc = found.docs[0]!
  expect(doc.name).toBe('Test e2e')

  // Status changes and moves `statusChangedAt`; what the customer sent stays as sent.
  const patched = await panel.patch(`/api/inquiries/${doc.id}`, {
    headers,
    data: { status: 'closed', name: 'Zmienione', priceAtInquiry: 1, number: 'PKG-2000-0001' },
  })
  expect(patched.status()).toBe(200)
  const after = ((await patched.json()) as { doc: Record<string, unknown> }).doc
  expect(after).toMatchObject({ status: 'closed', name: 'Test e2e', number })
  expect(Date.parse(after.statusChangedAt as string)).toBeGreaterThan(
    Date.parse(doc.statusChangedAt),
  )

  // Erasure on request: the record goes, the trail keeps the id and number, never the content.
  expect((await panel.delete(`/api/inquiries/${doc.id}`, { headers })).status()).toBe(200)
  const trail = (await (
    await panel.get(`/api/inquiry-deletions?where[inquiryId][equals]=${doc.id}`, { headers })
  ).json()) as { docs: Record<string, unknown>[] }
  expect(trail.docs).toHaveLength(1)
  expect(trail.docs[0]).toMatchObject({ number, reason: 'request', deletedByEmail: email })
  expect(JSON.stringify(trail.docs[0])).not.toContain('Test e2e')
  await panel.dispose()
})
