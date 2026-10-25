type Level = 'info' | 'warn' | 'error'

/**
 * Structured fields of a log line: ids, codes, counts — never form data (e-mail, phone,
 * name, message; ADR-G005). Pass a caught error as `error`: only its class and a short code
 * (`ECONNREFUSED`, SQLSTATE `28P01`) are logged, because database and SMTP messages quote query
 * parameters and recipients. A thrown non-`Error` value is logged as its type only.
 */
export type LogFields = Record<string, unknown>

export type Logger = Record<Level, (fields: LogFields, msg: string) => void> & {
  /** A logger that adds `bound` (e.g. `requestId`) to every line. */
  child: (bound: LogFields) => Logger
}

type LoggerOptions = {
  write?: (line: string) => void
  now?: () => Date
}

// Written last, so a field named like them cannot fake the level, time or message.
const FIXED = new Set(['level', 'time', 'msg'])
// Error codes are identifiers (`ECONNREFUSED`, `ETIMEDOUT`, SQLSTATE `42P01`), like class names;
// anything longer or with other characters (a thrown string may be form data) is not logged.
const IDENTIFIER = /^[A-Za-z0-9_]{1,40}$/

function codeOf(error: Error): string | undefined {
  for (const candidate of [error, error.cause]) {
    const code = (candidate as { code?: unknown } | undefined)?.code
    if (typeof code === 'string' && IDENTIFIER.test(code)) return code
  }
  return undefined
}

/**
 * Log fields of a caught value: the class and a short code of an `Error`, an identifier-like
 * string as it is (e.g. a class name), otherwise only the type. Never the message.
 */
export function errorFields(value: unknown): { error: string; errorCode?: string } {
  if (value instanceof Error) {
    const errorCode = codeOf(value)
    return errorCode ? { error: value.name, errorCode } : { error: value.name }
  }
  if (typeof value === 'string' && IDENTIFIER.test(value)) return { error: value }
  return { error: typeof value }
}

function serialize(fields: LogFields): LogFields {
  const out: LogFields = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || FIXED.has(key)) continue
    if (key === 'error') Object.assign(out, errorFields(value))
    else out[key] = value instanceof Error ? value.name : value
  }
  return out
}

/**
 * One JSON line per entry on stdout (Docker collects and rotates it): `level`, `time`, `msg` and
 * fields such as `requestId`. Own code instead of a library: a few lines cover it.
 */
export function createLogger(options: LoggerOptions = {}, bound: LogFields = {}): Logger {
  const write = options.write ?? ((line: string) => process.stdout.write(`${line}\n`))
  const now = options.now ?? (() => new Date())

  const entry = (level: Level) => (fields: LogFields, msg: string) => {
    write(
      JSON.stringify({
        level,
        time: now().toISOString(),
        ...serialize({ ...bound, ...fields }),
        msg,
      }),
    )
  }

  return {
    info: entry('info'),
    warn: entry('warn'),
    error: entry('error'),
    child: (more) => createLogger(options, { ...bound, ...more }),
  }
}

/** The app's logger (stdout). */
export const log = createLogger()
