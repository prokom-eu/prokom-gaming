import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { isPanelUser } from './access/panel'
import { Builds } from './collections/Builds'
import { Media } from './collections/Media'
import { Options } from './collections/Options'
import { PowerLevels } from './collections/PowerLevels'
import { PriceHistory } from './collections/PriceHistory'
import { PublishedPrices } from './collections/PublishedPrices'
import { Users } from './collections/Users'
import { PricingSettings } from './globals/PricingSettings'
import { SiteSettings } from './globals/SiteSettings'
import { MarginAlarmTask } from './jobs/marginAlarm'
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
    // Referenced by path (import map), never imported here: the prices screen uses the
    // server-only cost layer, which must stay out of the config the Payload CLI loads.
    components: {
      views: {
        prices: { Component: '/admin/prices/PricesView#PricesView', path: '/ceny', exact: true },
      },
      afterNavLinks: ['/admin/prices/PricesNavLink#PricesNavLink'],
    },
  },
  // New collections go at the end: Payload names compound indexes after their columns only,
  // so inserting earlier can renumber them in a later migration.
  collections: [Users, Media, Options, PowerLevels, Builds, PublishedPrices, PriceHistory],
  globals: [PricingSettings, SiteSettings],
  // Background jobs (ADR-G002 §4.4: margin alarm; later G6 retention). Run inside the Next process
  // (one VPS, not serverless) every minute; the cron starts with the first panel/API request.
  // Running and queueing through the REST API is panel-only: by default any signed-in account
  // could, and customers (G14) sign in too. Finished jobs are removed — nothing to keep.
  jobs: {
    tasks: [MarginAlarmTask],
    autoRun: [{ cron: '* * * * *', queue: 'default', limit: 5 }],
    deleteJobOnComplete: true,
    access: {
      run: ({ req }) => isPanelUser(req),
      queue: ({ req }) => isPanelUser(req),
      cancel: ({ req }) => isPanelUser(req),
    },
  },
  editor: lexicalEditor(),
  // The panel and the site use REST only. A second public API would need its own field-access
  // checks for costs and internal models (ADR-G002 §8.7), so GraphQL is off and its routes removed.
  graphQL: { disable: true },
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
