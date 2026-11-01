import { afterEach, describe, expect, it, vi } from 'vitest'

import { analyticsScript, track } from './analytics'

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
