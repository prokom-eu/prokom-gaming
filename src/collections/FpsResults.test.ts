import { APIError, ValidationError } from 'payload'
import type { PayloadRequest, Where } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { blockDeleteWithFpsResults, oneTestResultPerSlot, webUrl } from './FpsResults'

/** A request whose `payload.count` answers `totalDocs` and records the `where` it got. */
function fakeReq(totalDocs: number) {
  const count = vi.fn(async (_args: { where: Where }) => ({ totalDocs }))
  const req = { payload: { count }, t: (k: string) => k } as unknown as PayloadRequest
  return { req, count }
}

type ChangeArgs = Parameters<typeof oneTestResultPerSlot>[0]
const change = (req: PayloadRequest, data: object, originalDoc?: object) =>
  oneTestResultPerSlot({ data, originalDoc, req, operation: 'create' } as unknown as ChangeArgs)

const slot = { build: 7, game: 3, resolution: 'qhd' }

describe('oneTestResultPerSlot', () => {
  it('lets the first test number for a build × game × resolution through', async () => {
    const { req, count } = fakeReq(0)
    const data = { ...slot, kind: 'm', fps: 100 }
    await expect(change(req, data)).resolves.toBe(data)
    expect(count).toHaveBeenCalledOnce()
  })

  it('refuses a second test number or estimate for the same slot', async () => {
    const { req } = fakeReq(1)
    await expect(change(req, { ...slot, kind: 'e', fps: 90 })).rejects.toBeInstanceOf(
      ValidationError,
    )
  })

  it('measurements (p) may repeat — no check at all', async () => {
    const { req, count } = fakeReq(5)
    const data = { ...slot, kind: 'p', fps: 120 }
    await expect(change(req, data)).resolves.toBe(data)
    expect(count).not.toHaveBeenCalled()
  })

  it('an update checks the merged document and skips itself', async () => {
    const { req, count } = fakeReq(0)
    await change(req, { fps: 101 }, { id: 42, ...slot, build: { id: 7 }, kind: 'r' })
    const where = JSON.stringify(count.mock.calls[0][0].where)
    expect(where).toContain('{"build":{"equals":7}}')
    expect(where).toContain('{"resolution":{"equals":"qhd"}}')
    expect(where).toContain('{"id":{"not_equals":42}}')
  })
})

describe('blockDeleteWithFpsResults', () => {
  type DeleteArgs = Parameters<ReturnType<typeof blockDeleteWithFpsResults>>[0]
  const run = (field: 'build' | 'game', req: PayloadRequest) =>
    blockDeleteWithFpsResults(field)({ id: 3, req } as unknown as DeleteArgs)

  it('refuses with a readable 400 while results exist', async () => {
    const { req, count } = fakeReq(99)
    const error = await run('game', req).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(APIError)
    expect((error as APIError).status).toBe(400)
    expect((error as APIError).message).toContain('99 wyników FPS')
    expect(count.mock.calls[0][0].where).toEqual({ game: { equals: 3 } })
  })

  it('allows deleting a build without results', async () => {
    const { req } = fakeReq(0)
    await expect(run('build', req)).resolves.toBeUndefined()
  })
})

describe('webUrl — the source link goes straight into <a href> on the site', () => {
  type Options = Parameters<typeof webUrl>[1]
  const options = {
    req: { payload: { config: {} }, t: (k: string) => k },
    required: false,
  } as unknown as Options
  const check = (value: string | null) => webUrl(value as string, options)

  it('accepts http(s) addresses and empty values', async () => {
    expect(await check('https://www.techpowerup.com/review/x/')).toBe(true)
    expect(await check('http://example.test/')).toBe(true)
    expect(await check(null)).toBe(true)
  })

  it('refuses other protocols and text that is not an address', async () => {
    for (const value of ['javascript:alert(1)', 'data:text/html,x', 'www.techpowerup.com', 'TPU']) {
      expect(await check(value), value).toBe(
        'Podaj pełny adres testu, zaczynający się od https://.',
      )
    }
  })
})
