import { describe, expect, it } from 'vitest'

import { createLogger, errorFields } from './logger'

function capture() {
  const lines: string[] = []
  const log = createLogger({
    write: (line) => lines.push(line),
    now: () => new Date(Date.UTC(2026, 9, 17, 12)),
  })
  const parsed = () => lines.map((line) => JSON.parse(line) as Record<string, unknown>)
  return { lines, log, parsed }
}

describe('createLogger', () => {
  it('writes one JSON line with level, time and msg', () => {
    const { lines, log, parsed } = capture()
    log.info({}, 'Hello')
    expect(lines).toHaveLength(1)
    expect(lines[0]).not.toContain('\n')
    expect(parsed()[0]).toEqual({ level: 'info', time: '2026-10-17T12:00:00.000Z', msg: 'Hello' })
  })

  it('adds build, requestId and other fields', () => {
    const { log, parsed } = capture()
    log.warn({ build: 3, requestId: 'abc12345', inquiry: 7 }, 'Build has no published price')
    expect(parsed()[0]).toMatchObject({
      level: 'warn',
      build: 3,
      requestId: 'abc12345',
      inquiry: 7,
      msg: 'Build has no published price',
    })
  })

  it('child loggers carry their bound fields', () => {
    const { log, parsed } = capture()
    log.child({ requestId: 'req-1' }).error({ build: 1 }, 'Failed')
    expect(parsed()[0]).toMatchObject({ level: 'error', requestId: 'req-1', build: 1 })
  })

  it('keeps the fixed fields from being overwritten', () => {
    const { log, parsed } = capture()
    log.info({ level: 'error', time: 'x', msg: 'y' }, 'Real')
    expect(parsed()[0]).toMatchObject({ level: 'info', msg: 'Real' })
    expect(parsed()[0]?.time).toBe('2026-10-17T12:00:00.000Z')
  })

  it('logs only the class of an error, never its message (it may quote form data)', () => {
    const { lines, log, parsed } = capture()
    log.error({ error: new TypeError('duplicate key: jan@example.test') }, 'Not saved')
    expect(parsed()[0]?.error).toBe('TypeError')
    expect(lines[0]).not.toContain('jan@example.test')
  })

  it('adds a string error code, also from the cause (database driver errors)', () => {
    const { lines, log, parsed } = capture()
    const refused = Object.assign(new Error('connect ECONNREFUSED 10.0.0.5:5432'), {
      code: 'ECONNREFUSED',
    })
    const wrapped = new Error('Failed query: select … params: jan@example.test', {
      cause: Object.assign(new Error('relation "x" does not exist'), { code: '42P01' }),
    })
    log.error({ error: refused }, 'a')
    log.error({ error: wrapped }, 'b')
    log.error({ error: Object.assign(new Error('x'), { code: 42 }) }, 'c')
    const [a, b, c] = parsed()
    expect(a).toMatchObject({ error: 'Error', errorCode: 'ECONNREFUSED' })
    expect(b).toMatchObject({ error: 'Error', errorCode: '42P01' })
    expect(c).not.toHaveProperty('errorCode')
    expect(lines.join('')).not.toContain('jan@example.test')
    expect(lines.join('')).not.toContain('10.0.0.5')
  })

  it('logs only the type of a thrown non-Error value', () => {
    const { lines, log, parsed } = capture()
    log.error({ error: 'jan@example.test' }, 'Thrown string')
    expect(parsed()[0]?.error).toBe('string')
    expect(lines[0]).not.toContain('jan@example.test')
  })

  it('drops undefined fields', () => {
    const { log, parsed } = capture()
    log.info({ build: undefined }, 'x')
    expect(parsed()[0]).not.toHaveProperty('build')
  })
})

describe('errorFields', () => {
  it('keeps identifier-like strings (class names) and nothing else', () => {
    expect(errorFields('TypeError')).toEqual({ error: 'TypeError' })
    expect(errorFields('jan@example.test')).toEqual({ error: 'string' })
    expect(errorFields(null)).toEqual({ error: 'object' })
  })
})
