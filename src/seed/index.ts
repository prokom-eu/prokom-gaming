/**
 * Local seed: `pnpm seed` (runs through `payload run`). Idempotent — safe to run repeatedly.
 * Requires an up-to-date schema: run `pnpm payload migrate` first.
 * G1: the local panel admin only. The offer data from seed/prokomgaming/ arrives in G3.
 */
import { getPayload } from 'payload'

import config from '../payload.config'
import { assertSeedAllowed, parseSeedEnv } from './config'

assertSeedAllowed(process.env.NODE_ENV)
const { adminEmail, adminPassword } = parseSeedEnv(process.env)

const payload = await getPayload({ config })

try {
  const existing = await payload.count({
    collection: 'users',
    where: { email: { equals: adminEmail } },
    overrideAccess: true,
  })

  if (existing.totalDocs > 0) {
    payload.logger.info('Seed: local admin already exists, skipped.')
  } else {
    await payload.create({
      collection: 'users',
      data: { email: adminEmail, password: adminPassword },
      overrideAccess: true,
    })
    payload.logger.info('Seed: local admin created.')
  }
} finally {
  await payload.destroy()
}
