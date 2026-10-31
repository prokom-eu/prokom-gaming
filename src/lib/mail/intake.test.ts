import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { ERROR_ALARM_AT, runIntake, type IntakeState, type MailboxClient } from './intake'
import type { IncomingMail } from './parse'

const fixture = (name: string) =>
  readFileSync(path.resolve(__dirname, '../../../tests/fixtures/mail', name))

/** A mailbox in memory: UIDs and sources; records what was asked of it. */
function fakeMailbox(
  messages: { uid: number; file: string }[],
  box: { uidValidity: string; uidNext: number },
) {
  const asked: number[] = []
  const client: MailboxClient = {
    open: vi.fn(async () => box),
    fetchAfter: vi.fn(async (afterUid: number, limit: number) => {
      asked.push(afterUid)
      return messages
        .filter((m) => m.uid > afterUid)
        .slice(0, limit)
        .map((m) => ({ uid: m.uid, source: fixture(m.file) }))
    }),
    close: vi.fn(async () => {}),
  }
  return { client, asked }
}

const OWN = 'formularz@example.test'
const NOW = new Date('2026-11-02T19:00:00Z')
const state = (over: Partial<IntakeState> = {}): IntakeState => ({
  lastUid: 10,
  uidValidity: '777',
  errorCount: 0,
  ...over,
})

describe('runIntake (ADR-G008 pt 2)', () => {
  it('takes new mail after the last UID, skips own and automatic ones, moves the UID', async () => {
    const { client, asked } = fakeMailbox(
      [
        { uid: 10, file: 'bez-dopasowania.eml' },
        { uid: 11, file: 'numer-w-temacie.eml' },
        { uid: 12, file: 'autoresponder.eml' },
        { uid: 13, file: 'wlasny-nadawca.eml' },
        { uid: 14, file: 'bez-dopasowania.eml' },
      ],
      { uidValidity: '777', uidNext: 15 },
    )
    const stored: IncomingMail[] = []
    const store = vi.fn(async (mail: IncomingMail) => {
      stored.push(mail)
      return mail.subject.includes('PKG') ? ('thread' as const) : ('unmatched' as const)
    })
    const result = await runIntake({ client, state: state(), ownAddress: OWN, store, now: NOW })

    expect(asked).toEqual([10])
    expect(stored.map((m) => m.messageId)).toEqual([
      '<reply-1@mail.example.com>',
      '<new-3@example.org>',
    ])
    expect(result.counts).toEqual({ thread: 1, unmatched: 1, duplicate: 0, skipped: 2, failed: 0 })
    expect(result.state).toEqual({ lastUid: 14, uidValidity: '777', errorCount: 0 })
    expect(client.close).toHaveBeenCalled()
  })

  it('first run starts from now: the old mailbox is not imported', async () => {
    const { client } = fakeMailbox([{ uid: 3, file: 'bez-dopasowania.eml' }], {
      uidValidity: '777',
      uidNext: 41,
    })
    const store = vi.fn()
    const result = await runIntake({
      client,
      state: state({ lastUid: 0, uidValidity: null }),
      ownAddress: OWN,
      store,
      now: NOW,
    })
    expect(store).not.toHaveBeenCalled()
    expect(result.state).toEqual({ lastUid: 40, uidValidity: '777', errorCount: 0 })
    expect(result.restarted).toBe(true)
  })

  it('a changed UIDVALIDITY restarts from now instead of re-reading old UIDs', async () => {
    const { client } = fakeMailbox([{ uid: 2, file: 'bez-dopasowania.eml' }], {
      uidValidity: '900',
      uidNext: 5,
    })
    const store = vi.fn()
    const result = await runIntake({ client, state: state(), ownAddress: OWN, store, now: NOW })
    expect(store).not.toHaveBeenCalled()
    expect(result.state).toEqual({ lastUid: 4, uidValidity: '900', errorCount: 0 })
    expect(result.restarted).toBe(true)
  })

  it('stops at a failed store, keeps the UID before it and counts the error', async () => {
    const { client } = fakeMailbox(
      [
        { uid: 11, file: 'bez-dopasowania.eml' },
        { uid: 12, file: 'in-reply-to.eml' },
        { uid: 13, file: 'bez-dopasowania.eml' },
      ],
      { uidValidity: '777', uidNext: 14 },
    )
    const store = vi
      .fn()
      .mockResolvedValueOnce('unmatched')
      .mockRejectedValueOnce(new Error('db down'))
    const result = await runIntake({ client, state: state(), ownAddress: OWN, store, now: NOW })
    expect(store).toHaveBeenCalledTimes(2)
    expect(result.state).toEqual({ lastUid: 11, uidValidity: '777', errorCount: 1 })
    expect(result.error).toBe(true)
    expect(result.alarm).toBe(false)
  })

  it('a connection error counts, and the third one in a row raises the alarm once', async () => {
    const client: MailboxClient = {
      open: vi.fn(async () => {
        throw new Error('ECONNREFUSED')
      }),
      fetchAfter: vi.fn(),
      close: vi.fn(async () => {}),
    }
    const run = (errorCount: number) =>
      runIntake({ client, state: state({ errorCount }), ownAddress: OWN, store: vi.fn(), now: NOW })
    expect((await run(0)).alarm).toBe(false)
    expect((await run(ERROR_ALARM_AT - 1)).alarm).toBe(true)
    expect((await run(ERROR_ALARM_AT)).alarm).toBe(false)
    expect((await run(ERROR_ALARM_AT)).state).toEqual(state({ errorCount: ERROR_ALARM_AT + 1 }))
  })

  it('a success clears the error count', async () => {
    const { client } = fakeMailbox([], { uidValidity: '777', uidNext: 11 })
    const result = await runIntake({
      client,
      state: state({ errorCount: 5 }),
      ownAddress: OWN,
      store: vi.fn(),
      now: NOW,
    })
    expect(result.state.errorCount).toBe(0)
  })

  it('an unreadable message is kept as unmatched with a note, not retried forever', async () => {
    const client: MailboxClient = {
      open: vi.fn(async () => ({ uidValidity: '777', uidNext: 12 })),
      fetchAfter: vi.fn(async () => [{ uid: 11, source: Buffer.from([0xff, 0xfe]) }]),
      close: vi.fn(async () => {}),
    }
    const stored: IncomingMail[] = []
    const store = vi.fn(async (mail: IncomingMail) => {
      stored.push(mail)
      return 'unmatched' as const
    })
    const parse = vi.fn(async () => {
      throw new Error('broken MIME')
    })
    const result = await runIntake({
      client,
      state: state(),
      ownAddress: OWN,
      store,
      now: NOW,
      parse,
    })
    expect(stored[0]).toMatchObject({ from: null, messageId: null, subject: '' })
    expect(stored[0]?.body).toContain('UID 11')
    expect(result.counts.failed).toBe(1)
    expect(result.state.lastUid).toBe(11)
  })
})
