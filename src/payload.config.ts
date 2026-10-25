import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { getEnv } from './lib/env'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const env = getEnv()

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  // New collections go at the end: Payload names compound indexes after their columns only,
  // so inserting earlier can renumber them in a later migration.
  collections: [Users],
  editor: lexicalEditor(),
  // SMTP from env; locally Mailpit. Transport options are always given, so the adapter never
  // falls back to its ethereal.email test account. No verify at start: `build` must not need a
  // mail server; a broken SMTP shows up in the logs of the first send.
  email: nodemailerAdapter({
    defaultFromAddress: env.MAIL_FROM_ADDRESS,
    defaultFromName: env.MAIL_FROM_NAME,
    skipVerify: true,
    transportOptions: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      // A hung SMTP server must not hold a request until the proxy times out (defaults: 10 min).
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {}),
    },
  }),
  secret: env.PAYLOAD_SECRET,
  // Production: Payload's own lines (migrations, jobs, errors) in the same JSON shape as
  // `lib/logger` (`level` as text, ISO `time`, `msg`); locally the readable default stays.
  ...(env.NODE_ENV === 'production' && {
    logger: {
      options: {
        level: 'info',
        base: null,
        messageKey: 'msg',
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
        formatters: { level: (label: string) => ({ level: label }) },
      },
    },
  }),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    // Schema changes only through versioned migrations, never dev `push` (CLAUDE.md;
    // ADR-009 in prokom-web).
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
    // Production runs pending migrations itself when Payload starts: the standalone image has
    // no Payload CLI. Locally and in CI: `pnpm payload migrate`.
    prodMigrations: migrations,
    pool: {
      connectionString: env.DATABASE_URL,
    },
  }),
  sharp,
})
