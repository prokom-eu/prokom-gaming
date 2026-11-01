import { afterEach, describe, expect, it, vi } from 'vitest'

import { analyticsScript, track, umamiBeforeSend } from './analytics'

const scope = globalThis as { umami?: unknown }

afterEach(() => {
  delete scope.umami
})

describe('track (ADR-G009 pt 3)', () => {
  it('without the script it does nothing and never throws', () => {
    expect(() => track('compare_open')).not.toThrow()
    scope.umami = {}
    expect(() => track('game_pick', { game: 'fortnite' })).not.toThrow()
  })

  it('a failing script does not break the page', () => {
    scope.umami = {
      track: () => {
        throw new Error('blocked')
      },
    }
    expect(() => track('configurator_start')).not.toThrow()
  })

  it('passes the name and the data to Umami', () => {
    const spy = vi.fn()
    scope.umami = { track: spy }
    track('inquiry_sent', { type: 'build' })
    track('configurator_done')
    expect(spy).toHaveBeenNthCalledWith(1, 'inquiry_sent', { type: 'build' })
    expect(spy).toHaveBeenNthCalledWith(2, 'configurator_done', undefined)
  })
})

describe('analyticsScript (ADR-G009 pt 2)', () => {
  const ids = { UMAMI_SCRIPT_URL: '/_s/script.js', UMAMI_WEBSITE_ID: 'abc' }

  it('production and staging with both values', () => {
    expect(analyticsScript({ SITE_ENV: 'production', ...ids })).toEqual({
      src: '/_s/script.js',
      websiteId: 'abc',
    })
    expect(analyticsScript({ SITE_ENV: 'staging', ...ids })).not.toBeNull()
  })

  it('never locally, and never half-configured', () => {
    expect(analyticsScript({ SITE_ENV: 'local', ...ids })).toBeNull()
    expect(
      analyticsScript({ SITE_ENV: 'production', UMAMI_SCRIPT_URL: '/_s/script.js' }),
    ).toBeNull()
    expect(analyticsScript({ SITE_ENV: 'production', UMAMI_WEBSITE_ID: 'abc' })).toBeNull()
  })
})

describe('umamiBeforeSend (review G15: no secrets from addresses)', () => {
  const send = (url: string, referrer = '') =>
    umamiBeforeSend('event', { url, referrer, title: 't' })

  it('drops the query and the hash from the address and the referrer', () => {
    expect(
      send('/zapytanie/wyslane?nr=PKG-2026-0001&istota=wampir', '/konto/haslo?token=abc#x'),
    ).toEqual({ url: '/zapytanie/wyslane', referrer: '/konto/haslo', title: 't' })
  })

  it('never sends anything from the account pages', () => {
    expect(send('/konto')).toBe(false)
    expect(send('/konto/haslo?token=abc')).toBe(false)
    expect(send('/konto/weryfikacja?token=abc')).toBe(false)
    expect(send('/kontakt')).not.toBe(false)
  })

  it('hides the certificate code, keeps the certificate search page', () => {
    expect(send('/metryka/WMPR-7KQ2-M9XA-B3CD')).toMatchObject({ url: '/metryka/*' })
    expect(send('/', '/metryka/WMPR-7KQ2-M9XA-B3CD')).toMatchObject({ referrer: '/metryka/*' })
    expect(send('/metryka?kod=zly-kod')).toMatchObject({ url: '/metryka' })
  })

  // What the 3.4.1 tracker really sends as `url` (seen in G15): the full address.
  it('the same with full addresses', () => {
    const site = 'https://prokomgaming.pl'
    expect(send(`${site}/konto/haslo`)).toBe(false)
    expect(send(`${site}/konto`)).toBe(false)
    expect(send(`${site}/metryka/WMPR-7KQ2-M9XA-B3CD?x=1#y`)).toMatchObject({
      url: `${site}/metryka/*`,
    })
    expect(
      send(`${site}/zapytanie/wyslane?nr=PKG-2026-0001`, `${site}/konto/haslo?token=a`),
    ).toEqual({
      url: `${site}/zapytanie/wyslane`,
      referrer: `${site}/konto/haslo`,
      title: 't',
    })
    expect(send(`${site}/`)).toMatchObject({ url: `${site}/` })
  })

  it('works as the inlined source the layout sends to the browser', () => {
    const inlined = new Function(
      `return (${umamiBeforeSend.toString()})`,
    )() as typeof umamiBeforeSend
    expect(inlined('event', { url: '/metryka/ABC?x=1', referrer: 'https://google.com/' })).toEqual({
      url: '/metryka/*',
      referrer: 'https://google.com/',
    })
  })
})
