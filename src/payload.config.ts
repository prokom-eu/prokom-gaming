import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { isAdmin } from './access/panel'
import { PANEL_APP } from './admin/brand'
import { Builds } from './collections/Builds'
import { Customers } from './collections/Customers'
import { Faq } from './collections/Faq'
import { Guides } from './collections/Guides'
import { Stock } from './collections/Stock'
import { Vouchers } from './collections/Vouchers'
import { FpsResults } from './collections/FpsResults'
import { Games } from './collections/Games'
import { Inquiries } from './collections/Inquiries'
import { InquiryDeletions } from './collections/InquiryDeletions'
import { InquiryMessages } from './collections/InquiryMessages'
import { MailIntakeUnmatched } from './collections/MailIntakeUnmatched'
import { PushSubscriptions } from './collections/PushSubscriptions'
import { PriceSources } from './collections/PriceSources'
import { Media } from './collections/Media'
import { Options } from './collections/Options'
import { Orders } from './collections/Orders'
import { PowerLevels } from './collections/PowerLevels'
import { PriceHistory } from './collections/PriceHistory'
import { PublishedPrices } from './collections/PublishedPrices'
import { ReplyTemplates } from './collections/ReplyTemplates'
import { Tickets } from './collections/Tickets'
import { Units } from './collections/Units'
import { Users } from './collections/Users'
import { LegalPrivacy, LegalTerms } from './globals/Legal'
import { MailIntakeState } from './globals/MailIntakeState'
import { MailSettings } from './globals/MailSettings'
import { PricingSettings } from './globals/PricingSettings'
import { SiteSettings } from './globals/SiteSettings'
import { InquiryRetentionTask } from './jobs/inquiryRetention'
import { InquirySlaTask } from './jobs/inquirySla'
import { MailIntakeTask } from './jobs/mailIntake'
import { NotifySendTask } from './jobs/notifySend'
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
    // The panel is dark only (panel spec §2): its tokens are written for a dark background.
    theme: 'dark',
    // Phone: the panel as an app on the home screen (ADR-G010 §2). Payload passes this through
    // as Next metadata; the viewport is in `app/(payload)/layout.tsx`.
    meta: {
      titleSuffix: ' · PRO-KOM Panel',
      // Fixed path: the route handler lives at app/(payload)/admin/manifest.webmanifest.
      manifest: '/admin/manifest.webmanifest',
      icons: {
        icon: [{ url: PANEL_APP.icons.any192, sizes: '192x192', type: 'image/png' }],
        apple: [{ url: PANEL_APP.icons.apple180, sizes: '180x180', type: 'image/png' }],
      },
      appleWebApp: {
        capable: true,
        title: PANEL_APP.shortName,
        statusBarStyle: 'black-translucent',
      },
    },
    // Referenced by path (import map), never imported here: the panel views use the
    // server-only cost layer, which must stay out of the config the Payload CLI loads.
    // Every view checks access itself (`panelAccess`) — custom views are public by definition.
    // `exact` on every view: `/ceny` must not catch `/ceny/zatwierdzanie` (P6).
    components: {
      views: {
        // P2: the Pulpit „Dziś” replaces Payload's dashboard at /admin.
        dashboard: {
          Component: '/admin/dashboard/DashboardView#DashboardView',
          meta: { title: 'Pulpit' },
        },
        prices: {
          Component: '/admin/prices/PricesView#PricesView',
          path: '/ceny',
          exact: true,
          meta: { title: 'Ceny' },
        },
        inquiries: {
          Component: '/admin/inquiries/InquiriesView#InquiriesView',
          path: '/zapytania',
          exact: true,
          meta: { title: 'Zapytania' },
        },
        settings: {
          Component: '/admin/settings/SettingsView#SettingsView',
          path: '/ustawienia',
          exact: true,
          meta: { title: 'Ustawienia' },
        },
        data: {
          Component: '/admin/shell/DataView#DataView',
          path: '/dane',
          exact: true,
          meta: { title: 'Dane (listy)' },
        },
        panelPreview: {
          Component: '/admin/preview/PanelPreviewView#PanelPreviewView',
          path: '/podglad-panelu',
          exact: true,
          meta: { title: 'Podgląd komponentów', robots: { index: false, follow: false } },
        },
      },
      beforeNavLinks: ['/admin/shell/PanelNavLinks#PanelNavLinks'],
    },
  },
  // New collections go at the end: Payload names compound indexes after their columns only,
  // so inserting earlier can renumber them in a later migration.
  collections: [
    Users,
    Media,
    Options,
    PowerLevels,
    Builds,
    PublishedPrices,
    PriceHistory,
    Games,
    FpsResults,
    Inquiries,
    InquiryDeletions,
    Faq,
    Guides,
    Stock,
    Vouchers,
    Customers,
    Orders,
    Units,
    Tickets,
    ReplyTemplates,
    InquiryMessages,
    MailIntakeUnmatched,
    PushSubscriptions,
    PriceSources,
  ],
  globals: [PricingSettings, SiteSettings, LegalTerms, LegalPrivacy, MailSettings, MailIntakeState],
  // Background jobs (ADR-G002 §4.4: margin alarm; ADR-G005: daily inquiry retention). Run inside the Next process
  // (one VPS, not serverless) every minute; the cron starts with the first panel/API request.
  // Running and queueing through the REST API is panel-only: by default any signed-in account
  // could, and customers (G14) sign in too. Finished jobs are removed — nothing to keep.
  jobs: {
    tasks: [MarginAlarmTask, InquiryRetentionTask, InquirySlaTask, MailIntakeTask, NotifySendTask],
    autoRun: [{ cron: '* * * * *', queue: 'default', limit: 5 }],
    deleteJobOnComplete: true,
    access: {
      run: ({ req }) => isAdmin(req),
      queue: ({ req }) => isAdmin(req),
      cancel: ({ req }) => isAdmin(req),
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
