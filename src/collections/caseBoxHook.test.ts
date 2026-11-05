import sharp from 'sharp'
import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { stampCaseBox } from './caseBoxHook'

type HookArgs = Parameters<typeof stampCaseBox>[0]

const call = (data: Record<string, unknown>, file?: { data: Buffer }) => {
  const warn = vi.fn()
  const req = { file, payload: { logger: { warn } } } as unknown as PayloadRequest
  return { warn, result: stampCaseBox({ data, req } as HookArgs) }
}

const photo = () =>
  sharp({
    create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      {
        input: {
          create: {
            width: 50,
            height: 80,
            channels: 4,
            background: { r: 9, g: 9, b: 9, alpha: 1 },
          },
        },
        left: 25,
        top: 10,
      },
    ])
    .png()
    .toBuffer()

describe('stampCaseBox (media)', () => {
  it('measures the box of a new or replaced file', async () => {
    const { result } = call({ alt: 'Obudowa' }, { data: await photo() })
    expect(await result).toEqual({ alt: 'Obudowa', box: { x: 0.25, y: 0.1, w: 0.5, h: 0.8 } })
  })

  it('keeps the stored box when only the text changes (no file)', async () => {
    const data = { alt: 'Nowy opis', box: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 } }
    expect(await call(data).result).toBe(data)
  })

  it('clears the box for a file without transparency', async () => {
    const jpeg = await sharp({
      create: { width: 20, height: 20, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .jpeg()
      .toBuffer()
    expect(await call({ alt: 'x' }, { data: jpeg }).result).toEqual({
      alt: 'x',
      box: { x: null, y: null, w: null, h: null },
    })
  })

  it('lets an unreadable file upload and logs a warning without the file name', async () => {
    const { result, warn } = call({ alt: 'x' }, { data: Buffer.from('not an image') })
    expect(await result).toEqual({ alt: 'x' })
    expect(warn).toHaveBeenCalledOnce()
  })
})
