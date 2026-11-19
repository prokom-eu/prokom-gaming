import { describe, expect, it } from 'vitest'

import { isPushServiceEndpoint } from './endpoint'

describe('isPushServiceEndpoint (audit AB4, G-07)', () => {
  it('accepts the push services of the browsers', () => {
    expect(isPushServiceEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true)
    expect(isPushServiceEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc')).toBe(
      true,
    )
    expect(isPushServiceEndpoint('https://web.push.apple.com/QGx')).toBe(true)
    expect(isPushServiceEndpoint('https://wns2-db5p.notify.windows.com/w/?token=x')).toBe(true)
  })

  it('the reserved .test domain only locally (dev, CI e2e)', () => {
    expect(isPushServiceEndpoint('https://push.example.test/e2e', 'local')).toBe(true)
    expect(isPushServiceEndpoint('https://push.example.test/e2e', 'production')).toBe(false)
    expect(isPushServiceEndpoint('https://push.example.test/e2e', 'staging')).toBe(false)
  })

  it('refuses any other address', () => {
    expect(isPushServiceEndpoint('https://example.com/hook', 'production')).toBe(false)
    expect(isPushServiceEndpoint('https://fcm.googleapis.com.evil.example/x')).toBe(false)
    expect(isPushServiceEndpoint('https://127.0.0.1/x', 'production')).toBe(false)
    expect(isPushServiceEndpoint('http://fcm.googleapis.com/x')).toBe(false)
    expect(isPushServiceEndpoint('https://fcm.googleapis.com:8443/x')).toBe(false)
    expect(isPushServiceEndpoint('https://user:pw@fcm.googleapis.com/x')).toBe(false)
    expect(isPushServiceEndpoint('nie-adres')).toBe(false)
  })
})
