import { describe, expect, it, vi } from 'vitest'

import expected from '../../../tests/fixtures/pricing-expected.json'
import { sellPrices } from '../pricing/cost'
import { seedCatalog } from '../pricing/testing/seedCatalog'
import { CONSENT_CLAUSE } from './consent'
import type { Email } from './emails'
import { issueFormToken } from './spam'
import { submitInquiryWith, type Pricing, type StockUnit, type SubmitDeps } from './submit'

const secret = 's'.repeat(32)
const t0 = Date.UTC(2026, 9, 27, 12)
const catalog = seedCatalog()

const pricing: Pricing = {
  offer: {
    levels: catalog.levels,
    options: catalog.options,
    builds: expected.builds.map((b, i) => ({
      id: i + 1,
      slug: b.slug,
      name: b.name,
      config: b.config,
    })),
  },
  snapshot: {
    ...sellPrices(catalog),
    batch: 2,
    publishedAt: '2026-10-25T10:00:00.000Z',
    levelFrom: {},
  },
  labels: {
    level: Object.fromEntries(catalog.levels.map((l) => [l.code, `Klasa ${l.code}`])),
    option: Object.fromEntries(catalog.options.map((o) => [o.code, `Opcja ${o.code}`])),
  },
}
const wampir = expected.builds.find((b) => b.slug === 'wampir')
const wampirId = expected.builds.findIndex((b) => b.slug === 'wampir') + 1
if (!wampir) throw new Error('fixtures: no wampir')

// Personal data of the test inquiry: none of it may appear in a log line.
const personal = {
  name: 'Zofia Testowa',
  email: 'zofia.testowa@example.test',
  phone: '+48 600 111 222',
  message: 'Prywatna wiadomość klientki',
}

const body = (extra: Record<string, unknown> = {}) => ({
  type: 'build',
  build: 'wampir',
  games: ['cs2', 'nieznana-gra'],
  ...personal,
  preferredContact: 'phone',
  consent: { accepted: true, clauseVersion: CONSENT_CLAUSE.version },
  source: { url: 'https://prokomgaming.pl/zapytanie?zestaw=wampir' },
  formToken: issueFormToken(secret, t0 - 10_000),
  ...extra,
})

function setup(overrides: Partial<SubmitDeps> = {}) {
  const logs: unknown[] = []
  const record = (fields: unknown, msg: string) => logs.push({ fields, msg })
  const sent: Email[] = []
  const deps: SubmitDeps = {
    secret,
    now: () => t0,
    limiter: { hit: vi.fn(() => true) },
    loadPricing: vi.fn(async () => pricing),
    findGames: vi.fn(async () => [{ id: 7, slug: 'cs2', name: 'Counter-Strike 2' }]),
    loadStock: vi.fn(async () => null),
    reserveStock: vi.fn(async () => true),
    releaseStock: vi.fn(async () => {}),
    save: vi.fn(async () => ({ id: 41, number: 'PKG-2026-0041' })),
    sendEmail: vi.fn(async (email: Email) => {
      sent.push(email)
    }),
    defer: (task) => task(),
    notifyTo: 'gaming@example.test',
    responseTime: async () => 'zwykle w godzinę, codziennie 8–22',
    panelUrl: (id) => `http://localhost:3100/admin/collections/inquiries/${id}`,
    log: { info: record, warn: record, error: record },
    ...overrides,
  }
  return { deps, logs, sent }
}

const noPersonalData = (logs: unknown[]) => {
  const text = JSON.stringify(logs)
  for (const value of Object.values(personal)) expect(text).not.toContain(value)
}

describe('submitInquiryWith', () => {
  it('answers before the e-mails: they run in the deferred task (after the response)', async () => {
    const tasks: (() => Promise<void>)[] = []
    const { deps, sent } = setup({ defer: (task) => void tasks.push(task) })
    const result = await submitInquiryWith(deps, { ip: '203.0.113.5', body: body() })
    expect(result).toMatchObject({ ok: true, number: 'PKG-2026-0041' })
    expect(deps.save).toHaveBeenCalledOnce()
    expect(sent).toEqual([])
    await Promise.all(tasks.map((task) => task()))
    expect(sent).toHaveLength(2)
  })

  it('saves the build priced by the server, sends both e-mails and returns the number', async () => {
    const { deps, sent, logs } = setup()
    const result = await submitInquiryWith(deps, {
      ip: '203.0.113.5',
      body: body({ price: 1, priceAtInquiry: 1, lightColor: 'lod' }),
    })
    expect(result).toEqual({ ok: true, id: 41, number: 'PKG-2026-0041' })

    expect(deps.save).toHaveBeenCalledOnce()
    const saved = vi.mocked(deps.save).mock.calls[0]?.[0]
    expect(saved).toMatchObject({
      type: 'build',
      status: 'new',
      build: wampirId,
      config: wampir.config,
      priceAtInquiry: wampir.price,
      priceBatch: 2,
      lightColor: 'lod',
      games: [7],
      consent: {
        accepted: true,
        clauseVersion: CONSENT_CLAUSE.version,
        acceptedAt: new Date(t0).toISOString(),
      },
      marketingConsent: false,
    })

    expect(sent.map((e) => e.to)).toEqual(['gaming@example.test', personal.email])
    expect(sent[0]?.replyTo).toBe(personal.email)
    expect(sent[0]?.subject).toBe(`Zapytanie PKG-2026-0041 — Gotowy zestaw — ${wampir.name}`)
    expect(sent[1]?.replyTo).toBe('gaming@example.test')
    expect(sent[1]?.text).toContain('Odpiszemy zwykle w godzinę, codziennie 8–22.')
    noPersonalData(logs)
  })

  it('rejects spam before anything else: honeypot, missing, forged or too fast token', async () => {
    const cases = [
      body({ website: 'http://spam.example' }),
      body({ formToken: undefined }),
      body({ formToken: issueFormToken('x'.repeat(32), t0 - 10_000) }),
      body({ formToken: issueFormToken(secret, t0 - 500) }),
    ]
    for (const input of cases) {
      const { deps } = setup()
      expect(await submitInquiryWith(deps, { ip: null, body: input })).toEqual({
        ok: false,
        error: 'spam',
      })
      expect(deps.save).not.toHaveBeenCalled()
    }
  })

  it('invalid input: field paths only, nothing saved, the limit untouched', async () => {
    const { deps, logs } = setup()
    const result = await submitInquiryWith(deps, {
      ip: null,
      body: body({ email: 'nie-adres', nip: '123' }),
    })
    expect(result).toEqual({ ok: false, error: 'invalid', fields: ['email', 'nip'] })
    expect(deps.save).not.toHaveBeenCalled()
    expect(deps.limiter.hit).not.toHaveBeenCalled()
    noPersonalData(logs)
  })

  it('a body that is not an object is invalid', async () => {
    const { deps } = setup()
    expect(await submitInquiryWith(deps, { ip: null, body: ['x'] })).toEqual({
      ok: false,
      error: 'invalid',
      fields: [],
    })
  })

  it('an incompatible configuration is rejected with the broken rules', async () => {
    const broken = expected.scenarios.find((s) => s.errors.length > 0)
    if (!broken) throw new Error('fixtures: no broken scenario')
    const { deps } = setup()
    const result = await submitInquiryWith(deps, {
      ip: null,
      body: body({ type: 'config', build: undefined, config: broken.config }),
    })
    expect(result).toEqual({
      ok: false,
      error: 'invalid',
      fields: ['config'],
      compat: broken.errors,
    })
    expect(deps.save).not.toHaveBeenCalled()
  })

  it('without published prices an inquiry with a computer is unavailable, not saved', async () => {
    const { deps } = setup({ loadPricing: async () => null })
    expect(await submitInquiryWith(deps, { ip: null, body: body() })).toEqual({
      ok: false,
      error: 'unavailable',
    })
    expect(deps.save).not.toHaveBeenCalled()
  })

  it('an inquiry without a computer does not read prices', async () => {
    const { deps } = setup()
    const result = await submitInquiryWith(deps, {
      ip: null,
      body: body({ type: 'advice', build: undefined, forWhom: 'child', budget: '6k_9k' }),
    })
    expect(result.ok).toBe(true)
    expect(deps.loadPricing).not.toHaveBeenCalled()
    expect(vi.mocked(deps.save).mock.calls[0]?.[0]).toMatchObject({
      build: null,
      priceAtInquiry: null,
      forWhom: 'child',
    })
  })

  it('over the limit: 429 before saving', async () => {
    const { deps } = setup({ limiter: { hit: () => false } })
    expect(await submitInquiryWith(deps, { ip: '203.0.113.5', body: body() })).toEqual({
      ok: false,
      error: 'rate_limited',
    })
    expect(deps.save).not.toHaveBeenCalled()
  })

  it('the limiter gets a keyed hash, never the IP', async () => {
    const hit = vi.fn((_key: string) => true)
    const { deps } = setup({ limiter: { hit } })
    await submitInquiryWith(deps, { ip: '203.0.113.5', body: body() })
    expect(hit.mock.calls[0]?.[0]).toMatch(/^[0-9a-f]{64}$/)
  })

  it('a database error is unavailable and logs no personal data', async () => {
    const failure = new Error(`insert failed: ${personal.email}`)
    const { deps, logs } = setup({ save: async () => Promise.reject(failure) })
    expect(await submitInquiryWith(deps, { ip: null, body: body() })).toEqual({
      ok: false,
      error: 'unavailable',
    })
    expect(deps.sendEmail).not.toHaveBeenCalled()
    noPersonalData(logs)
  })

  it('a failed e-mail still returns the number (the record is the source of truth)', async () => {
    const smtp = Object.assign(new Error(`550 ${personal.email}`), { code: 'EENVELOPE' })
    const { deps, logs } = setup({ sendEmail: async () => Promise.reject(smtp) })
    const result = await submitInquiryWith(deps, { ip: null, body: body() })
    expect(result).toMatchObject({ ok: true, number: 'PKG-2026-0041' })
    expect(JSON.stringify(logs)).toContain('EENVELOPE')
    noPersonalData(logs)
  })

  it('without a notification inbox only the confirmation goes out', async () => {
    const { deps, sent } = setup({ notifyTo: null })
    await submitInquiryWith(deps, { ip: null, body: body() })
    expect(sent.map((e) => e.to)).toEqual([personal.email])
    expect(sent[0]?.replyTo).toBeUndefined()
  })
})

describe('submitInquiryWith — voucher and „Gotowe od ręki” (G13)', () => {
  const unit: StockUnit = {
    id: 9,
    buildSlug: 'wampir',
    changes: {},
    discount: 300,
    active: true,
    reservedUntil: null,
    location: 'rabka',
    conditionNote: 'egzemplarz pokazowy',
    marginOk: true,
  }
  const ready = (extra: Record<string, unknown> = {}) =>
    body({ type: 'ready', build: undefined, games: [], stock: 9, ...extra })

  it('voucher: saved with amount and look, both e-mails, no computer', async () => {
    const { deps, sent, logs } = setup()
    const voucher = { amount: 1000, design: 'perun', recipient: 'Dla Kuby', dedication: 'Sto lat!' }
    const result = await submitInquiryWith(deps, {
      ip: null,
      body: body({ type: 'voucher', build: undefined, games: [], voucher }),
    })
    expect(result).toMatchObject({ ok: true })
    expect(vi.mocked(deps.save).mock.calls[0]?.[0]).toMatchObject({
      type: 'voucher',
      build: null,
      priceAtInquiry: null,
      voucher,
      stock: null,
    })
    expect(deps.loadPricing).not.toHaveBeenCalled()
    expect(sent[0]?.text).toMatch(/Bon: 1\s000 zł, wygląd Perun/)
    expect(sent[0]?.text).toContain('Dedykacja: Sto lat!')
    // The confirmation does not repeat what the person typed (recipient, dedication).
    expect(sent[1]?.text).toMatch(/Bon podarunkowy: 1\s000 zł, wygląd Perun/)
    expect(sent[1]?.text).not.toContain('Sto lat!')
    noPersonalData(logs)
  })

  it('ready: the unit priced by the server (build minus discount), reserved for 24 h', async () => {
    const { deps, sent } = setup({ loadStock: vi.fn(async () => unit) })
    const result = await submitInquiryWith(deps, { ip: null, body: ready({ price: 1 }) })
    expect(result).toMatchObject({ ok: true })
    expect(deps.reserveStock).toHaveBeenCalledWith(
      9,
      new Date(t0 + 86_400_000).toISOString(),
      new Date(t0).toISOString(),
    )
    expect(vi.mocked(deps.save).mock.calls[0]?.[0]).toMatchObject({
      type: 'ready',
      stock: 9,
      build: wampirId,
      config: wampir.config,
      priceAtInquiry: wampir.price - 300,
    })
    expect(sent[0]?.text).toContain('Zarezerwowany do:')
    expect(sent[1]?.text).toContain('Zarezerwowany egzemplarz:')
  })

  it('ready: a unit that is gone, off the site or reserved is refused without saving', async () => {
    for (const found of [
      null,
      { ...unit, active: false },
      { ...unit, marginOk: false },
      { ...unit, reservedUntil: new Date(t0 + 60_000).toISOString() },
    ]) {
      const { deps } = setup({ loadStock: vi.fn(async () => found) })
      const result = await submitInquiryWith(deps, { ip: null, body: ready() })
      expect(result).toEqual({ ok: false, error: 'invalid', fields: ['stock'] })
      expect(deps.save).not.toHaveBeenCalled()
      expect(deps.reserveStock).not.toHaveBeenCalled()
    }
  })

  it('ready: someone else claimed it first → refused; a failed save gives the unit back', async () => {
    const lost = setup({
      loadStock: vi.fn(async () => unit),
      reserveStock: vi.fn(async () => false),
    })
    expect(await submitInquiryWith(lost.deps, { ip: null, body: ready() })).toEqual({
      ok: false,
      error: 'invalid',
      fields: ['stock'],
    })
    expect(lost.deps.save).not.toHaveBeenCalled()

    const broken = setup({
      loadStock: vi.fn(async () => unit),
      save: vi.fn(async () => Promise.reject(new Error('db down'))),
    })
    expect(await submitInquiryWith(broken.deps, { ip: null, body: ready() })).toEqual({
      ok: false,
      error: 'unavailable',
    })
    expect(broken.deps.releaseStock).toHaveBeenCalledWith(9)
  })
})
