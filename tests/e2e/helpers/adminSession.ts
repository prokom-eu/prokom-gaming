import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Written by `auth.setup.ts` (one login per run); ignored by git. Not in `test-results/`, which
 * Playwright empties at the start of every run (`--no-deps` reruns keep the last session).
 */
export const ADMIN_STATE = path.resolve('playwright/.auth/admin.json')
export const ADMIN_TOKEN = path.resolve('playwright/.auth/admin.token')

/** `Authorization` header of the seed admin session from `auth.setup.ts`. */
export function adminHeaders(): Record<string, string> {
  return { Authorization: `JWT ${readFileSync(ADMIN_TOKEN, 'utf8').trim()}` }
}
