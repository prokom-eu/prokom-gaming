import { describe, expect, it } from 'vitest'

import { statusAfterReply } from './status'

describe('statusAfterReply', () => {
  it('first reply: new → in_progress', () => {
    expect(statusAfterReply('new', null)).toBe('in_progress')
    expect(statusAfterReply('new', 'reply')).toBe('in_progress')
  })

  it('an offer template marks offer_sent from new or in progress', () => {
    expect(statusAfterReply('new', 'offer')).toBe('offer_sent')
    expect(statusAfterReply('in_progress', 'offer')).toBe('offer_sent')
  })

  it('later replies keep in_progress and offer_sent', () => {
    expect(statusAfterReply('in_progress', 'reply')).toBe('in_progress')
    expect(statusAfterReply('offer_sent', 'reply')).toBe('offer_sent')
  })

  it('finished inquiries are not reopened', () => {
    expect(statusAfterReply('won', 'offer')).toBe('won')
    expect(statusAfterReply('lost', null)).toBe('lost')
    expect(statusAfterReply('closed', 'reply')).toBe('closed')
  })
})
