import type { PayloadRequest } from 'payload'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const queueMarginAlarm = vi.fn()
vi.mock('../jobs/queue', () => ({ queueMarginAlarm }))

const { queueAlarmOnCostChange } = await import('./marginAlarmHook')

type Doc = { id: number; code: string; cost: number }
const hook = queueAlarmOnCostChange<Doc>((d) => String(d.cost))
type Args = Parameters<typeof hook>[0]
const req = { payload: {} } as unknown as PayloadRequest
const run = (args: Partial<Args>) =>
  hook({ operation: 'update', context: {}, req, ...args } as Args)

describe('queueAlarmOnCostChange', () => {
  beforeEach(() => queueMarginAlarm.mockReset())

  it('queues the margin alarm when a cost changed in the panel', async () => {
    const doc = { id: 1, code: 'R16', cost: 500 }
    await expect(run({ doc, previousDoc: { ...doc, cost: 450 } })).resolves.toBe(doc)
    expect(queueMarginAlarm).toHaveBeenCalledWith(req.payload, 'cost changed: R16', req)
  })

  it('does nothing for an unchanged cost, a new item or when the caller handles the alarm', async () => {
    const doc = { id: 1, code: 'R16', cost: 500 }
    await run({ doc, previousDoc: doc })
    await run({ doc, previousDoc: { ...doc, cost: 1 }, operation: 'create' })
    await run({ doc, previousDoc: { ...doc, cost: 1 }, context: { skipMarginAlarm: true } })
    expect(queueMarginAlarm).not.toHaveBeenCalled()
  })

  it('a failure to queue never blocks saving the cost', async () => {
    queueMarginAlarm.mockRejectedValueOnce(new Error('db down'))
    const doc = { id: 1, code: 'R16', cost: 500 }
    await expect(run({ doc, previousDoc: { ...doc, cost: 450 } })).resolves.toBe(doc)
  })
})
