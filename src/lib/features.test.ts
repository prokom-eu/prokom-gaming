import { describe, expect, it } from 'vitest'

import { features } from './features'

describe('features', () => {
  it('is off unless the variable is exactly 1', () => {
    expect(features({})).toEqual({ ready: false, voucher: false })
    expect(features({ FEATURE_READY: '1', FEATURE_VOUCHER: 'true' })).toEqual({
      ready: true,
      voucher: false,
    })
  })
})
