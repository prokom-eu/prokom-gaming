import { describe, expect, it } from 'vitest'

import expected from '../../../tests/fixtures/pricing-expected.json'
import { sellPrices } from '../pricing/cost'
import { seedCatalog } from '../pricing/testing/seedCatalog'
import {
  canSend,
  draftOf,
  draftQuery,
  goTo,
  hasComputer,
  initialState,
  inquiryType,
  MESSAGES,
  pickBuild,
  priceOf,
  reviewOf,
  sentSummaryOf,
  stepErrors,
  stepOfFields,
  summaryOf,
  toPayload,
  type FormData,
  type FormState,
} from './form'
import { parseInquiryInput } from './schema'

const catalog = seedCatalog()
const data: FormData = {
  offer: {
    levels: catalog.levels,
    options: catalog.options,
    builds: expected.builds.map((b, i) => ({ id: i + 1, ...b })),
  },
  snapshot: {
    ...sellPrices(catalog),
    batch: 1,
    publishedAt: '2026-10-25T12:00:00.000Z',
    levelFrom: {},
  },
  labels: {
    level: {},
    option: { R32: '32 GB DDR5', R64: '64 GB DDR5', NM1: '1 TB NVMe', NM2: '2 TB NVMe' },
  },
  builds: expected.builds.map((b) => ({
    slug: b.slug,
    name: b.name,
    key: b.slug === 'baba-jaga' ? 'baba' : b.slug,
    power: 'Moc VII',
    realm: '4K',
  })),
  levels: {
    P13: { power: 'Moc VII', realm: '4K', build: 'wampir', cpu: 'Ryzen 7', gpu: 'RTX' },
  },
  games: [
    { slug: 'counter-strike-2', name: 'Counter-Strike 2' },
    { slug: 'fortnite', name: 'Fortnite' },
    { slug: 'cyberpunk-2077', name: 'Cyberpunk 2077' },
  ],
}

const wampir = expected.builds.find((b) => b.slug === 'wampir')!
const start = (query: string) => initialState(new URLSearchParams(query), data)

/** Contact data that passes step 3. */
const contact = (state: FormState): FormState => ({
  ...state,
  name: 'Jan',
  email: 'jan@example.test',
  consent: true,
})

const context = { url: 'http://localhost:3100/zapytanie', token: 't', honeypot: '' }
const send = (state: FormState) => toPayload(state, context)
const accepted = (state: FormState) => parseInquiryInput(send(state)).success

describe('initialState: entry from the address', () => {
  it('build page: build, its changes and the light colour', () => {
    const state = start('zestaw=wampir&ram=R64&ssd=NM2&swiatlo=lod')
    expect(state).toMatchObject({
      mode: 'build',
      build: 'wampir',
      changes: { ram: 'R64', ssd: 'NM2' },
      light: 'lod',
    })
    expect(inquiryType(state)).toBe('build')
    expect(send(contact(state))).toMatchObject({
      type: 'build',
      build: 'wampir',
      config: { ram: 'R64', ssd: 'NM2' },
      lightColor: 'lod',
    })
    expect(accepted(contact(state))).toBe(true)
  })

  it('configurator: five codes, the other part goes to the notes', () => {
    const state = start('k=P13.LB500.PL3LX.R32.NM1&inne=Fractal%20North')
    expect(state.config).toEqual(wampir.config)
    expect(inquiryType(state)).toBe('config')
    expect(state.message).toBe('Obudowa albo chłodzenie spoza listy: Fractal North')
    expect(send(contact(state))).toMatchObject({ type: 'config', config: wampir.config })
    expect(send(contact(state))).not.toHaveProperty('build', expect.anything())
    expect(accepted(contact(state))).toBe(true)
  })

  it('comparison: first build asked about, all of them in the notes', () => {
    const state = start('z=wampir,weles,nie-ma,wampir')
    expect(state).toMatchObject({ build: 'wampir', compared: ['wampir', 'weles'] })
    expect(state.message).toBe('Z porównania: Wampir, Weles.')
    expect(inquiryType(state)).toBe('compare')
    expect(accepted(contact(state))).toBe(true)
  })

  it('ignores unknown builds, malformed codes and colours', () => {
    const state = start('zestaw=nie-ma&k=P13.LB500&swiatlo=neon&ram=R64;DROP')
    expect(state).toMatchObject({ build: null, config: null, light: null, changes: {} })
    expect(start('zestaw=wampir&ram=R64;DROP').changes).toEqual({})
  })

  it('the computer parameters', () => {
    expect(hasComputer(new URLSearchParams('zestaw=wampir'))).toBe(true)
    expect(hasComputer(new URLSearchParams('swiatlo=lod&inne=x'))).toBe(false)
  })
})

describe('draft (inquiry counter)', () => {
  const restore = (state: FormState) => start(draftQuery(JSON.stringify(draftOf(state))) ?? 'none')

  it('keeps the address of the picked computer and opens it again', () => {
    const state = start('zestaw=wampir&ram=R64&swiatlo=lod')
    expect(restore(state)).toMatchObject({ build: 'wampir', changes: { ram: 'R64' }, light: 'lod' })
    const config = start('k=P13.LB500.PL3LX.R32.NM1')
    expect(restore(config).config).toEqual(wampir.config)
    // A comparison keeps all builds, the one now picked first.
    const compared = pickBuild(start('z=wampir,weles'), 'weles')
    expect(restore({ ...compared, compared: ['wampir', 'weles'] })).toMatchObject({
      build: 'weles',
      compared: ['weles', 'wampir'],
    })
  })

  it('nothing without a computer; unreadable storage is ignored', () => {
    expect(draftOf({ ...start('zestaw=wampir'), mode: 'advice' })).toEqual([])
    expect(draftOf(start(''))).toEqual([])
    expect(draftQuery('{nope')).toBeNull()
    expect(draftQuery('[1]')).toBeNull()
  })
})

describe('type and payload per mode', () => {
  it('advice and a custom list carry no computer, colour or recipe changes', () => {
    const picked = contact(start('zestaw=wampir&swiatlo=lod'))
    const advice = { ...picked, mode: 'advice' as const, forWhom: 'child' as const }
    expect(send(advice)).toMatchObject({ type: 'advice', forWhom: 'child' })
    expect(send(advice).build).toBeUndefined()
    expect(send(advice).lightColor).toBeUndefined()
    expect(accepted(advice)).toBe(true)

    const list = {
      ...picked,
      mode: 'list' as const,
      customList: ' Ryzen 7, RTX ',
      forWhom: 'gift' as const,
    }
    expect(send(list)).toMatchObject({ type: 'custom_list', customList: 'Ryzen 7, RTX' })
    expect(send(list).forWhom).toBeUndefined()
    expect(accepted(list)).toBe(true)
  })

  it('NIP only for a company invoice; UTM from the address of the page', () => {
    const state = contact({ ...start('zestaw=wampir'), nip: '735-251-14-47' })
    expect(send(state).nip).toBeUndefined()
    const company = { ...state, invoice: 'company' as const }
    expect(send(company).nip).toBe('735-251-14-47')
    expect(accepted(company)).toBe(true)
    const tagged = toPayload(state, { ...context, url: `${context.url}?utm_source=tiktok` })
    expect(tagged.source).toMatchObject({ utmSource: 'tiktok' })
  })

  it('a new sigil drops changes made to another build', () => {
    const state = start('zestaw=wampir&ram=R64')
    expect(pickBuild(state, 'weles')).toMatchObject({ build: 'weles', changes: {} })
    expect(pickBuild(start('k=P13.LB500.PL3LX.R32.NM1'), 'weles').config).toBeNull()
  })
})

describe('price preview (the server function)', () => {
  it('a build costs what the fixtures say; a change costs more', () => {
    expect(priceOf(start('zestaw=wampir'), data)).toMatchObject({ ok: true, price: wampir.price })
    const bigger = priceOf(start('zestaw=wampir&ram=R64'), data)
    expect(bigger?.ok && bigger.price).toBeGreaterThan(wampir.price)
  })

  it('a code off the price list blocks step 1 with a reason; no prices = no preview', () => {
    const stale = start('zestaw=wampir&ram=R999')
    expect(priceOf(stale, data)).toMatchObject({ ok: false })
    expect(stepErrors(stale, data, 0).computer).toMatch(/nie możemy dziś wycenić/)
    expect(priceOf(start('zestaw=wampir'), { ...data, snapshot: null })).toBeNull()
  })
})

describe('validation', () => {
  it('step 1: a computer, or the custom list', () => {
    expect(stepErrors(start(''), data, 0)).toEqual({ computer: MESSAGES.computer })
    expect(stepErrors({ ...start(''), mode: 'advice' }, data, 0)).toEqual({})
    expect(stepErrors({ ...start(''), mode: 'list' }, data, 0)).toEqual({
      customList: MESSAGES.customList,
    })
  })

  it('step 3: name, e-mail (same rule as the server), consent', () => {
    expect(stepErrors(start(''), data, 2)).toEqual({
      name: MESSAGES.name,
      email: MESSAGES.emailEmpty,
      consent: MESSAGES.consent,
    })
    const typo = { ...contact(start('')), email: 'jan@foo-.pl' }
    expect(stepErrors(typo, data, 2)).toEqual({ email: MESSAGES.emailInvalid })
    expect(stepErrors(contact(start('')), data, 2)).toEqual({})
  })

  it('step 3: phone for a call, NIP with its check digit', () => {
    const call = { ...contact(start('')), preferredContact: 'phone' as const }
    expect(stepErrors(call, data, 2)).toEqual({ phone: MESSAGES.phoneEmpty })
    expect(stepErrors({ ...call, phone: '12-34' }, data, 2)).toEqual({
      phone: MESSAGES.phoneInvalid,
    })
    const firm = { ...contact(start('')), invoice: 'company' as const }
    expect(stepErrors(firm, data, 2)).toEqual({ nip: MESSAGES.nipEmpty })
    expect(stepErrors({ ...firm, nip: '7352511448' }, data, 2)).toEqual({
      nip: MESSAGES.nipInvalid,
    })
  })

  it('forward stops on the first step with errors and shows them; back always works', () => {
    const state = start('')
    const stopped = goTo(state, data, 3)
    expect(stopped).toMatchObject({ step: 0, tried: [true, false, false, false] })
    const picked = pickBuild(stopped, 'wampir')
    expect(goTo(picked, data, 3)).toMatchObject({ step: 2, tried: [true, false, true, false] })
    expect(goTo({ ...picked, step: 2 }, data, 0).step).toBe(0)
    expect(canSend(picked, data)).toBe(false)
    expect(canSend(contact(picked), data)).toBe(true)
  })

  it('API field paths map to the step to correct', () => {
    expect(stepOfFields(['config.ram'])).toBe(0)
    expect(stepOfFields(['monitor', 'email'])).toBe(1)
    expect(stepOfFields(['nip'])).toBe(2)
    expect(stepOfFields([])).toBe(2)
  })
})

describe('summary, review and the sent page', () => {
  const state: FormState = {
    ...contact(start('zestaw=wampir&ram=R64&swiatlo=lod')),
    games: ['counter-strike-2', 'fortnite', 'cyberpunk-2077'],
    monitor: 'qhd',
    refresh: '144',
  }

  it('live summary: sigil, name, price and the board rows', () => {
    const summary = summaryOf(state, data)
    expect(summary).toMatchObject({
      key: 'wampir',
      title: 'Wampir',
      sub: 'Moc VII, 4K, światło Lód',
    })
    expect(summary.price).toBeGreaterThan(wampir.price)
    expect(summary.rows).toEqual([
      { label: 'Gry', value: 'Counter-Strike 2, Fortnite i 1 inne' },
      { label: 'Monitor', value: '2K, 144 Hz' },
      { label: 'Odbiór', value: 'Kurier' },
    ])
    expect(summaryOf(start(''), data)).toMatchObject({ key: null, title: 'Wybierz komputer' })
  })

  it('review: each row opens its step', () => {
    const rows = reviewOf(state, data)
    expect(rows[0]).toEqual({
      label: 'Komputer',
      value: 'Wampir, Moc VII, 4K, pamięć 64 GB DDR5, światło Lód',
      step: 0,
    })
    expect(rows.find((r) => r.label === 'Kontakt')).toEqual({
      label: 'Kontakt',
      value: 'Jan, jan@example.test, odpowiedź: e-mail',
      step: 2,
    })
  })

  it('sent page: public labels of the parts, never codes or costs', () => {
    const sent = sentSummaryOf(state, data)
    expect(sent.rows).toEqual([
      { label: 'Procesor', value: 'Ryzen 7' },
      { label: 'Karta', value: 'RTX' },
      { label: 'Pamięć', value: '64 GB DDR5' },
      { label: 'Dysk', value: '1 TB NVMe' },
      { label: 'Odbiór', value: 'kurier, w cenie' },
    ])
    expect(JSON.stringify(sent)).not.toMatch(/P13|R64|cost/)
  })
})
