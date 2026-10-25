import { describe, expect, it } from 'vitest'

import { requestIdFrom } from './requestId'

describe('requestIdFrom', () => {
  it('keeps a well-formed id from the reverse proxy (Nginx $request_id)', () => {
    expect(requestIdFrom('0123456789abcdef0123456789abcdef')).toBe(
      '0123456789abcdef0123456789abcdef',
    )
    expect(requestIdFrom('3f2c1a9e-7b1d-4c2a-9a63-0e5b6d9f1c2a')).toBe(
      '3f2c1a9e-7b1d-4c2a-9a63-0e5b6d9f1c2a',
    )
  })

  it('makes a new UUID when the header is missing', () => {
    const id = requestIdFrom(null)
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(requestIdFrom(null)).not.toBe(id)
  })

  it.each(['', 'short', 'x'.repeat(65), 'abc def 12345', 'jan@example.test', 'a\nb12345678'])(
    'replaces a malformed id (%j) — the client controls it and it lands in logs',
    (value) => {
      const id = requestIdFrom(value)
      expect(id).not.toBe(value)
      expect(id).toMatch(/^[0-9a-f-]{36}$/)
    },
  )
})
