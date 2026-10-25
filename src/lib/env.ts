import { z } from 'zod'

// Only variables the app reads today. INQUIRY_NOTIFY_EMAIL, ALERT_EMAIL, INQUIRY_RETENTION_MONTHS
// and SITE_URL (.env.example) join the schema in the session that starts using them (G4/G6/G15).
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
  })
  // SMTP login is both or neither: a half-set pair would fail only at the first e-mail.
  .refine((env) => Boolean(env.SMTP_USER) === Boolean(env.SMTP_PASS), {
    message: 'set both SMTP_USER and SMTP_PASS, or neither',
    path: ['SMTP_PASS'],
  })

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
