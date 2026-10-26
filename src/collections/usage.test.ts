import { APIError, ValidationError } from 'payload'
import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { blockDeactivateWhenUsed, blockDeleteWhenUsed } from './usage'

/** A request whose Local API `find` returns the given build names. */
function fakeReq(names: string[]) {
  const find = vi.fn().mockResolvedValue({ docs: names.map((name) => ({ name })) })
  const req = { payload: { find }, t: ((key: string) => key) as PayloadRequest['t'] }
  return { req: req as unknown as PayloadRequest, find }
}

type ChangeArgs = Parameters<typeof blockDeactivateWhenUsed>[0]
const change = (args: Partial<ChangeArgs>) => blockDeactivateWhenUsed(args as ChangeArgs)

describe('blockDeleteWhenUsed', () => {
  const hook = blockDeleteWhenUsed(['case', 'ram'], 'Zmień zestaw.')
  type Args = Parameters<typeof hook>[0]

  it('refuses with a public 400 naming the builds', async () => {
    const { req, find } = fakeReq(['Bies', 'Wampir'])
    const run = hook({ id: 7, req } as Args)
    await expect(run).rejects.toBeInstanceOf(APIError)
    await expect(run).rejects.toMatchObject({
      status: 400,
      isPublic: true,
      // Both kept so the message survives Payload's error format in the minified production build.
      name: 'APIError',
      data: { builds: ['Bies', 'Wampir'] },
      message: 'Nie można usunąć — używane w zestawie: Bies, Wampir. Zmień zestaw.',
    })
    expect(find.mock.calls[0]![0]).toMatchObject({
      collection: 'builds',
      where: { or: [{ case: { equals: 7 } }, { ram: { equals: 7 } }] },
      overrideAccess: true,
    })
  })

  it('lets an unused document go', async () => {
    const { req } = fakeReq([])
    await expect(hook({ id: 7, req } as Args)).resolves.toBeUndefined()
  })
})

describe('blockDeactivateWhenUsed', () => {
  it('refuses switching "Aktywna" off for an option in a build', async () => {
    const { req } = fakeReq(['Wampir'])
    const run = change({
      operation: 'update',
      data: { active: false },
      originalDoc: { id: 3, active: true },
      req,
    })
    await expect(run).rejects.toBeInstanceOf(ValidationError)
  })

  it('does not query for anything else', async () => {
    const { req, find } = fakeReq(['Wampir'])
    const data = { active: false }
    // A new option, an option that stays active, one that was already off.
    await expect(change({ operation: 'create', data, req })).resolves.toBe(data)
    await expect(
      change({ operation: 'update', data: { cost: 1 }, originalDoc: { id: 3, active: true }, req }),
    ).resolves.toEqual({ cost: 1 })
    await expect(
      change({ operation: 'update', data, originalDoc: { id: 3, active: false }, req }),
    ).resolves.toBe(data)
    expect(find).not.toHaveBeenCalled()
  })

  it('allows switching off an unused option', async () => {
    const { req } = fakeReq([])
    const data = { active: false }
    await expect(
      change({ operation: 'update', data, originalDoc: { id: 3, active: true }, req }),
    ).resolves.toBe(data)
  })
})
