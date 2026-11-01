import { z } from 'zod'

// Variables the app reads or the image sets (MEDIA_DIR, SITE_ENV: Dockerfile, compose in G16).
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    PAYLOAD_SECRET: z.string().min(32),
    // Directory for uploaded files (relative to the app's working directory or absolute);
    // a Docker volume on the server (G16).
    MEDIA_DIR: z.string().min(1).default('media'),
    // Which deployment this is: staging is never indexed (noindex, robots `Disallow: /`, G15).
    SITE_ENV: z.enum(['production', 'staging', 'local']).default('local'),
    // Outgoing mail. Locally Mailpit from docker/compose.dev.yml (SMTP 1026, UI 8026).
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535),
    // `true` = TLS from the first byte (port 465); `false` = STARTTLS when the server offers it.
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    // Sender of every mail: an address in a domain with SPF/DKIM/DMARC (G16). Never hard-coded,
    // so moving the mail provider changes no code.
    MAIL_FROM_ADDRESS: z.email(),
    MAIL_FROM_NAME: z.string().min(1).default('PRO-KOM Gaming'),
    // Where the margin alarm goes (ADR-G002 §4.4). Required in production; locally optional —
    // without it the alarm only logs a warning (Krystian's decision, 26.10.2026).
    ALERT_EMAIL: z.email().optional(),
    // Public address of the site, no trailing slash: links in e-mails (G6: the panel link in the
    // inquiry notification), later canonical URLs and the sitemap (G15). Locally defaults to
    // http://localhost:3100 (set below, after the production check).
    SITE_URL: z
      .url({ protocol: /^https?$/ })
      .transform((url) => url.replace(/\/+$/, ''))
      .optional(),
    // Mailbox of inquiry notifications (ADR-G005). Required in production; locally optional —
    // without it only the customer's confirmation goes out and a warning is logged.
    INQUIRY_NOTIFY_EMAIL: z.email().optional(),
    // Closed inquiries (`lost`, `closed`) are deleted this many months after the last status
    // change (ADR-G005; to be confirmed with the privacy policy).
    INQUIRY_RETENTION_MONTHS: z.coerce.number().int().min(1).max(120).default(24),
    // Customers' answers read from the Gaming mailbox (ADR-G008 pt 2, P4) — the same mailbox as
    // MAIL_FROM_ADDRESS. All three of host, user and password, or none: without them reading is off
    // (the panel says so) and sending still works. Port 993 = TLS from the first byte; any other
    // port upgrades with STARTTLS.
    IMAP_HOST: z.string().min(1).optional(),
    IMAP_PORT: z.coerce.number().int().min(1).max(65535).default(993),
    IMAP_USER: z.string().min(1).optional(),
    IMAP_PASSWORD: z.string().min(1).optional(),
    // Folder for copies of replies sent from the panel; empty = the folder the server marks as
    // „Sent” (special-use \Sent), else „Sent”.
    IMAP_SENT_FOLDER: z.string().min(1).optional(),
    // Push notifications on the panel's phones (ADR-G010 pt 4, P4). All three or none: without
    // them push is off (the panel says so) and the e-mail alarms still go. The public key goes to
    // the browser in the panel's HTML; the private one never leaves the server.
    VAPID_PUBLIC_KEY: z.string().min(40).optional(),
    VAPID_PRIVATE_KEY: z.string().min(20).optional(),
    // Contact for the push services: `mailto:` of the Gaming mailbox.
    VAPID_SUBJECT: z
      .string()
      .regex(/^(mailto:|https:\/\/)/, 'mailto: or https:// address')
      .optional(),
    // Price check through the Claude API (ADR-G007, P7). Without it „Sprawdź ceny” is off with a
    // message (the panel says so). Server only, never in the browser or the repo.
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    // Tests only: `1` = a fake Claude that answers from fixed data (e2e, CI). Refused in a production
    // build unless SITE_URL is localhost.
    PRICE_CHECK_FAKE: z.enum(['0', '1']).default('0'),
  })
  // SMTP login is both or neither: a half-set pair would fail only at the first e-mail.
  .refine((env) => Boolean(env.SMTP_USER) === Boolean(env.SMTP_PASS), {
    message: 'set both SMTP_USER and SMTP_PASS, or neither',
    path: ['SMTP_PASS'],
  })
  .refine(
    (env) =>
      new Set([env.IMAP_HOST, env.IMAP_USER, env.IMAP_PASSWORD].map((value) => Boolean(value)))
        .size === 1,
    {
      message: 'set all of IMAP_HOST, IMAP_USER and IMAP_PASSWORD, or none',
      path: ['IMAP_PASSWORD'],
    },
  )
  .refine(
    (env) =>
      new Set(
        [env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT].map((value) =>
          Boolean(value),
        ),
      ).size === 1,
    {
      message: 'set all of VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT, or none',
      path: ['VAPID_SUBJECT'],
    },
  )
  .refine(
    // A production build may use the fake only on localhost (CI, local e2e on `next start`).
    (env) =>
      env.NODE_ENV !== 'production' ||
      env.PRICE_CHECK_FAKE === '0' ||
      /^http:\/\/localhost(:\d+)?\/*$/.test(env.SITE_URL ?? ''),
    {
      message: 'the fake price check is for tests only',
      path: ['PRICE_CHECK_FAKE'],
    },
  )
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.ALERT_EMAIL), {
    message: 'required in production (margin alarm)',
    path: ['ALERT_EMAIL'],
  })
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.INQUIRY_NOTIFY_EMAIL), {
    message: 'required in production (inquiry notifications)',
    path: ['INQUIRY_NOTIFY_EMAIL'],
  })
  // Explicit in production: a silent localhost default would send the panel link in every
  // notification to nowhere (review G6). CI's `next start` sets it to its own localhost on purpose.
  .refine((env) => env.NODE_ENV !== 'production' || Boolean(env.SITE_URL), {
    message: 'required in production (links in e-mails)',
    path: ['SITE_URL'],
  })
  .transform((env) => ({ ...env, SITE_URL: env.SITE_URL ?? 'http://localhost:3100' }))

export type Env = z.infer<typeof envSchema>

/**
 * Validates environment variables. The error lists variable names and reasons only,
 * never values, so secrets do not leak into logs.
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment variables (see .env.example):\n${problems}`)
  }
  return result.data
}

export type ImapConfig = {
  host: string
  port: number
  user: string
  password: string
  sentFolder: string | null
}

/** The mailbox to read, or `null` when reading is switched off (no IMAP_* set). */
export function imapConfig(env: Env): ImapConfig | null {
  if (!env.IMAP_HOST || !env.IMAP_USER || !env.IMAP_PASSWORD) return null
  return {
    host: env.IMAP_HOST,
    port: env.IMAP_PORT,
    user: env.IMAP_USER,
    password: env.IMAP_PASSWORD,
    sentFolder: env.IMAP_SENT_FOLDER ?? null,
  }
}

export type VapidConfig = { publicKey: string; privateKey: string; subject: string }

/** Keys for push, or `null` when push is switched off (no VAPID_* set). */
export function vapidConfig(env: Env): VapidConfig | null {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return null
  return {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT,
  }
}

export type PriceCheckConfig = { mode: 'live'; apiKey: string } | { mode: 'fake' }

/** How the price check talks to Claude, or `null` when it is off (no key, no fake). */
export function priceCheckConfig(env: Env): PriceCheckConfig | null {
  if (env.PRICE_CHECK_FAKE === '1') return { mode: 'fake' }
  return env.ANTHROPIC_API_KEY ? { mode: 'live', apiKey: env.ANTHROPIC_API_KEY } : null
}

let cached: Env | undefined

/** Validated `process.env`; throws on first use when something is missing or invalid. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env)
  return cached
}
