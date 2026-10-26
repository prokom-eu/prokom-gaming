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
  })
  // SMTP login is both or neither: a half-set pair would fail only at the first e-mail.
  .refine((env) => Boolean(env.SMTP_USER) === Boolean(env.SMTP_PASS), {
    message: 'set both SMTP_USER and SMTP_PASS, or neither',
    path: ['SMTP_PASS'],
  })
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

let cached: Env | undefined

/** Validated `process.env`; throws on first use when something is missing or invalid. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env)
  return cached
}
