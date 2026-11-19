import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import { restrictLockedDocuments } from './lockedDocuments'
import { staffOnly } from './panel'

describe('restrictLockedDocuments (audit AB4, G-02)', () => {
  it('narrows every operation of payload-locked-documents to panel users', () => {
    const access: Record<string, unknown> = {
      create: 'any',
      read: 'any',
      update: 'any',
      delete: 'any',
    }
    const payload = {
      collections: { 'payload-locked-documents': { config: { access } } },
    } as unknown as Payload

    expect(restrictLockedDocuments(payload)).toBe(true)
    expect(access).toEqual({
      create: staffOnly,
      read: staffOnly,
      update: staffOnly,
      delete: staffOnly,
    })
  })

  it('does nothing when the collection is absent', () => {
    expect(restrictLockedDocuments({ collections: {} } as unknown as Payload)).toBe(false)
  })
})
