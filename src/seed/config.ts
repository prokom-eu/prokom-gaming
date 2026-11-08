import { z } from 'zod'

import { PASSWORD_MIN_LENGTH } from '../lib/auth/password'

/** Hard stop: the seed creates a known admin account and must never touch production data. */
export function assertSeedAllowed(nodeEnv: string | undefined): void {
  if (nodeEnv === 'production') {
    throw new Error('Seed is disabled in production (NODE_ENV=production).')
  }
}

const seedEnvSchema = z.object({
  SEED_ADMIN_EMAIL: z.email(),
  SEED_ADMIN_PASSWORD: z.string().min(PASSWORD_MIN_LENGTH),
})

export type SeedConfig = { adminEmail: string; adminPassword: string }

/** Local admin credentials for the seed. Errors list variable names only, never values. */
export function parseSeedEnv(source: Record<string, string | undefined>): SeedConfig {
  const result = seedEnvSchema.safeParse(source)
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.code}`)
      .join('\n')
    throw new Error(`Invalid seed variables (see .env.example):\n${problems}`)
  }
  return {
    adminEmail: result.data.SEED_ADMIN_EMAIL,
    adminPassword: result.data.SEED_ADMIN_PASSWORD,
  }
}
