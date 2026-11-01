import { describe, expect, it } from 'vitest'

import { imapConfig, parseEnv, vapidConfig } from './env'

const valid = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://prokom:prokom@127.0.0.1:54321/prokom_gaming',
  PAYLOAD_SECRET: 'a'.repeat(32),
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1026',
  MAIL_FROM_ADDRESS: 'formularz@example.test',
}

const defaults = {
  MEDIA_DIR: 'media',
  SITE_ENV: 'local',
  SMTP_PORT: 1026,
  SMTP_SECURE: false,
  MAIL_FROM_NAME: 'PRO-KOM Gaming',
  SITE_URL: 'http://localhost:3100',
  IMAP_PORT: 993,
  INQUIRY_RETENTION_MONTHS: 24,
  PRICE_CHECK_FAKE: '0',
}

describe('parseEnv', () => {
  it('accepts a valid environment', () => {
    expect(parseEnv(valid)).toEqual({ ...valid, ...defaults })
  })

  it('ALERT_EMAIL: optional locally, required in production, must be an address', () => {
    expect(parseEnv({ ...valid, ALERT_EMAIL: 'alarm@example.test' }).ALERT_EMAIL).toBe(
      'alarm@example.test',
    )
    expect(() => parseEnv({ ...valid, NODE_ENV: 'production' })).toThrow(/ALERT_EMAIL/)
    expect(
      parseEnv({
        ...valid,
        NODE_ENV: 'production',
        ALERT_EMAIL: 'a@example.test',
        INQUIRY_NOTIFY_EMAIL: 'gaming@example.test',
        SITE_URL: 'https://prokomgaming.pl',
      }),
    ).toBeTruthy()
    expect(() => parseEnv({ ...valid, ALERT_EMAIL: 'not-an-address' })).toThrow(/ALERT_EMAIL/)
  })

  it('INQUIRY_NOTIFY_EMAIL: optional locally, required in production', () => {
    const production = {
      ...valid,
      NODE_ENV: 'production',
      ALERT_EMAIL: 'a@example.test',
      SITE_URL: 'https://prokomgaming.pl',
    }
    expect(() => parseEnv(production)).toThrow(/INQUIRY_NOTIFY_EMAIL/)
    expect(parseEnv({ ...production, INQUIRY_NOTIFY_EMAIL: 'g@example.test' })).toBeTruthy()
    expect(() => parseEnv({ ...valid, INQUIRY_NOTIFY_EMAIL: 'nope' })).toThrow(
      /INQUIRY_NOTIFY_EMAIL/,
    )
  })

  it('SITE_URL: localhost by default locally, required in production', () => {
    expect(parseEnv(valid).SITE_URL).toBe('http://localhost:3100')
    const production = {
      ...valid,
      NODE_ENV: 'production',
      ALERT_EMAIL: 'a@example.test',
      INQUIRY_NOTIFY_EMAIL: 'g@example.test',
    }
    expect(() => parseEnv(production)).toThrow(/SITE_URL/)
    expect(parseEnv({ ...production, SITE_URL: 'https://prokomgaming.pl' }).SITE_URL).toBe(
      'https://prokomgaming.pl',
    )
  })

  it('SITE_URL: http(s) only, trailing slash removed', () => {
    expect(parseEnv({ ...valid, SITE_URL: 'https://prokomgaming.pl/' }).SITE_URL).toBe(
      'https://prokomgaming.pl',
    )
    expect(() => parseEnv({ ...valid, SITE_URL: 'ftp://example.test' })).toThrow(/SITE_URL/)
  })

  it('INQUIRY_RETENTION_MONTHS: whole months, 1–120', () => {
    expect(parseEnv({ ...valid, INQUIRY_RETENTION_MONTHS: '36' }).INQUIRY_RETENTION_MONTHS).toBe(36)
    expect(() => parseEnv({ ...valid, INQUIRY_RETENTION_MONTHS: '0' })).toThrow(
      /INQUIRY_RETENTION_MONTHS/,
    )
  })

  it('requires the SMTP server and the sender address', () => {
    expect(() => parseEnv({ ...valid, SMTP_HOST: undefined })).toThrow(/SMTP_HOST/)
    expect(() => parseEnv({ ...valid, SMTP_PORT: undefined })).toThrow(/SMTP_PORT/)
    expect(() => parseEnv({ ...valid, MAIL_FROM_ADDRESS: undefined })).toThrow(/MAIL_FROM_ADDRESS/)
  })

  it('reads SMTP credentials and TLS', () => {
    const env = parseEnv({
      ...valid,
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USER: 'formularz',
      SMTP_PASS: 'x'.repeat(16),
    })
    expect(env).toMatchObject({ SMTP_PORT: 465, SMTP_SECURE: true, SMTP_USER: 'formularz' })
  })

  it('requires SMTP_USER and SMTP_PASS together', () => {
    expect(() => parseEnv({ ...valid, SMTP_USER: 'formularz' })).toThrow(/SMTP_PASS/)
    expect(() => parseEnv({ ...valid, SMTP_PASS: 'x'.repeat(16) })).toThrow(/SMTP_PASS/)
  })

  it('reading mail is off without IMAP_*, on with all three (ADR-G008)', () => {
    expect(imapConfig(parseEnv(valid))).toBeNull()
    const imap = {
      IMAP_HOST: 'imap.example.test',
      IMAP_USER: 'gaming',
      IMAP_PASSWORD: 'p'.repeat(16),
    }
    expect(imapConfig(parseEnv({ ...valid, ...imap, IMAP_PORT: '143' }))).toEqual({
      host: 'imap.example.test',
      port: 143,
      user: 'gaming',
      password: 'p'.repeat(16),
      sentFolder: null,
    })
    expect(() => parseEnv({ ...valid, IMAP_HOST: 'imap.example.test' })).toThrow(/IMAP_PASSWORD/)
    expect(() => parseEnv({ ...valid, ...imap, IMAP_USER: undefined })).toThrow(/IMAP_PASSWORD/)
  })

  it('push is off without VAPID_*, on with all three (ADR-G010)', () => {
    expect(vapidConfig(parseEnv(valid))).toBeNull()
    const vapid = {
      VAPID_PUBLIC_KEY: 'B'.repeat(87),
      VAPID_PRIVATE_KEY: 'k'.repeat(43),
      VAPID_SUBJECT: 'mailto:gaming@example.test',
    }
    expect(vapidConfig(parseEnv({ ...valid, ...vapid }))).toEqual({
      publicKey: 'B'.repeat(87),
      privateKey: 'k'.repeat(43),
      subject: 'mailto:gaming@example.test',
    })
    expect(() => parseEnv({ ...valid, VAPID_PUBLIC_KEY: 'B'.repeat(87) })).toThrow(/VAPID_SUBJECT/)
    expect(() => parseEnv({ ...valid, ...vapid, VAPID_SUBJECT: 'gaming@example.test' })).toThrow(
      /VAPID_SUBJECT/,
    )
  })

  it('rejects an invalid SMTP_PORT or SMTP_SECURE', () => {
    expect(() => parseEnv({ ...valid, SMTP_PORT: 'smtp' })).toThrow(/SMTP_PORT/)
    expect(() => parseEnv({ ...valid, SMTP_SECURE: 'yes' })).toThrow(/SMTP_SECURE/)
  })

  it('rejects an invalid MAIL_FROM_ADDRESS', () => {
    expect(() => parseEnv({ ...valid, MAIL_FROM_ADDRESS: 'PRO-KOM <a@b.pl>' })).toThrow(
      /MAIL_FROM_ADDRESS/,
    )
  })

  it('accepts staging as SITE_ENV and rejects an unknown one', () => {
    expect(parseEnv({ ...valid, SITE_ENV: 'staging' }).SITE_ENV).toBe('staging')
    expect(() => parseEnv({ ...valid, SITE_ENV: 'prod' })).toThrow(/SITE_ENV/)
  })

  it('accepts a custom MEDIA_DIR', () => {
    expect(parseEnv({ ...valid, MEDIA_DIR: '/data/media' }).MEDIA_DIR).toBe('/data/media')
  })

  it('defaults NODE_ENV to development', () => {
    expect(parseEnv({ ...valid, NODE_ENV: undefined }).NODE_ENV).toBe('development')
  })

  it('rejects a missing or non-postgres DATABASE_URL', () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/)
    expect(() => parseEnv({ ...valid, DATABASE_URL: 'mongodb://127.0.0.1/db' })).toThrow(
      /DATABASE_URL/,
    )
  })

  it('rejects a too short PAYLOAD_SECRET without printing its value', () => {
    const secret = 'too-short-secret'
    expect(() => parseEnv({ ...valid, PAYLOAD_SECRET: secret })).toThrow(/PAYLOAD_SECRET/)
    expect(() => parseEnv({ ...valid, PAYLOAD_SECRET: secret })).not.toThrow(secret)
  })
})

describe('price check (P7, ADR-G007)', async () => {
  const { priceCheckConfig } = await import('./env')
  const base = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    PAYLOAD_SECRET: 'a'.repeat(32),
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '1026',
    MAIL_FROM_ADDRESS: 'formularz@example.test',
  }
  it('is off without a key, live with one, fake for tests', () => {
    expect(priceCheckConfig(parseEnv(base))).toBeNull()
    expect(priceCheckConfig(parseEnv({ ...base, ANTHROPIC_API_KEY: 'x' }))).toEqual({
      mode: 'live',
      apiKey: 'x',
    })
    expect(priceCheckConfig(parseEnv({ ...base, PRICE_CHECK_FAKE: '1' }))).toEqual({ mode: 'fake' })
  })
  it('the fake is refused in a production build outside localhost', () => {
    const prod = {
      ...base,
      NODE_ENV: 'production',
      ALERT_EMAIL: 'a@example.test',
      INQUIRY_NOTIFY_EMAIL: 'b@example.test',
    }
    expect(() =>
      parseEnv({ ...prod, SITE_URL: 'https://prokomgaming.pl', PRICE_CHECK_FAKE: '1' }),
    ).toThrow(/PRICE_CHECK_FAKE/)
    expect(
      priceCheckConfig(
        parseEnv({ ...prod, SITE_URL: 'http://localhost:3100', PRICE_CHECK_FAKE: '1' }),
      ),
    ).toEqual({ mode: 'fake' })
  })
})
