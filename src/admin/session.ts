import 'server-only'

import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload, type Payload } from 'payload'

import type { User } from '../payload-types'
import { panelAccess, type PanelNeed } from './access'

/**
 * The signed-in panel account for a server action (`'use server'`), or `null` without the role.
 * Actions are plain POST endpoints: each one calls this first, like every view calls
 * `panelAccess` (ADR-G006 §3).
 */
export async function panelActionSession(
  need: PanelNeed,
): Promise<{ payload: Payload; user: User } | null> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!panelAccess({ user }, need).ok) return null
  return { payload, user: user as User }
}
