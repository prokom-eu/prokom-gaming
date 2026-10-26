import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

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
  INQUIRY_RETENTION_MONTHS: 24,
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
      }),
    ).toBeTruthy()
    expect(() => parseEnv({ ...valid, ALERT_EMAIL: 'not-an-address' })).toThrow(/ALERT_EMAIL/)
  })

  it('INQUIRY_NOTIFY_EMAIL: optional locally, required in production', () => {
    const production = { ...valid, NODE_ENV: 'production', ALERT_EMAIL: 'a@example.test' }
    expect(() => parseEnv(production)).toThrow(/INQUIRY_NOTIFY_EMAIL/)
    expect(parseEnv({ ...production, INQUIRY_NOTIFY_EMAIL: 'g@example.test' })).toBeTruthy()
    expect(() => parseEnv({ ...valid, INQUIRY_NOTIFY_EMAIL: 'nope' })).toThrow(
      /INQUIRY_NOTIFY_EMAIL/,
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
