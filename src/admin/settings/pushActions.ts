'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { errorFields, log } from '../../lib/logger'
import { notify } from '../../lib/notify'
import { KIND_ROLES, PUSH_KINDS, type PushKind } from '../../lib/notify/kinds'
import type { User } from '../../payload-types'
import { panelActionSession } from '../session'

/**
 * Settings → Powiadomienia na telefon (ADR-G010, panel spec §13): switch a device on, choose the
 * kinds, remove it, send a test. Admin only, checked on the server; a user touches only their own
 * devices. Logs ids only — never an endpoint (it works like a password for that device) or keys.
 */

const PATH = '/admin/ustawienia'
// TODO(krystian): texts of the results — no board for this section.
const DENIED = 'Brak uprawnień — zaloguj się do panelu.'
const FAILED = 'Nie udało się. Spróbuj ponownie.'
const GONE = 'Tego urządzenia już nie ma na liście.'

export type PushResult = { ok: boolean; message: string }

const id = z.number().int().positive()
const SaveInput = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  label: z.string().trim().min(1).max(60),
})
const KindsInput = z.object({ id, kinds: z.array(z.enum(PUSH_KINDS)).max(PUSH_KINDS.length) })
const IdInput = z.object({ id })

type Session = NonNullable<Awaited<ReturnType<typeof panelActionSession>>>

const allowedKinds = (user: User): PushKind[] =>
  PUSH_KINDS.filter((k) => (KIND_ROLES[k] as readonly string[]).includes(user.role ?? ''))

/** The user's own device, or `null`. */
async function own(session: Session, deviceId: number) {
  const device = await session.payload.findByID({
    collection: 'push-subscriptions',
    id: deviceId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!device) return null
  const owner = typeof device.user === 'object' ? device.user.id : device.user
  return owner === session.user.id ? device : null
}

/** A new browser subscription; the same endpoint again (re-subscribe) updates it. */
export async function savePushSubscription(raw: unknown): Promise<PushResult> {
  const input = SaveInput.safeParse(raw)
  if (!input.success) return { ok: false, message: FAILED }
  const session = await panelActionSession('admin')
  if (!session) return { ok: false, message: DENIED }
  const { payload, user } = session
  const { endpoint, keys, label } = input.data
  try {
    const { docs } = await payload.find({
      collection: 'push-subscriptions',
      where: { endpoint: { equals: endpoint } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const data = {
      user: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      label,
      failCount: 0,
      disabledAt: null,
    }
    const existing = docs[0]
    if (existing) {
      await payload.update({
        collection: 'push-subscriptions',
        id: existing.id,
        data,
        depth: 0,
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'push-subscriptions',
        data: { ...data, kinds: allowedKinds(user) },
        depth: 0,
        overrideAccess: true,
      })
    }
  } catch (error) {
    log.error({ user: user.id, ...errorFields(error) }, 'push: subscription not saved')
    return { ok: false, message: FAILED }
  }
  log.info({ user: user.id }, 'push: device switched on')
  revalidatePath(PATH)
  return { ok: true, message: 'Powiadomienia włączone na tym urządzeniu.' }
}

export async function updatePushKinds(raw: unknown): Promise<PushResult> {
  const input = KindsInput.safeParse(raw)
  if (!input.success) return { ok: false, message: FAILED }
  const session = await panelActionSession('admin')
  if (!session) return { ok: false, message: DENIED }
  try {
    const device = await own(session, input.data.id)
    if (!device) return { ok: false, message: GONE }
    const allowed = new Set<string>(allowedKinds(session.user))
    await session.payload.update({
      collection: 'push-subscriptions',
      id: device.id,
      data: { kinds: input.data.kinds.filter((k) => allowed.has(k)) },
      depth: 0,
      overrideAccess: true,
    })
  } catch (error) {
    log.error({ device: input.data.id, ...errorFields(error) }, 'push: kinds not saved')
    return { ok: false, message: FAILED }
  }
  revalidatePath(PATH)
  return { ok: true, message: 'Zapisano.' }
}

export async function deletePushDevice(raw: unknown): Promise<PushResult> {
  const input = IdInput.safeParse(raw)
  if (!input.success) return { ok: false, message: FAILED }
  const session = await panelActionSession('admin')
  if (!session) return { ok: false, message: DENIED }
  try {
    const device = await own(session, input.data.id)
    if (!device) return { ok: false, message: GONE }
    await session.payload.delete({
      collection: 'push-subscriptions',
      id: device.id,
      overrideAccess: true,
    })
  } catch (error) {
    log.error({ device: input.data.id, ...errorFields(error) }, 'push: device not deleted')
    return { ok: false, message: FAILED }
  }
  revalidatePath(PATH)
  return { ok: true, message: 'Usunięto urządzenie.' }
}

/**
 * „Wyślij próbne”: through `notify-send` like every notification, run at once; then the device's
 * state says how it went (delivered / removed by the push service / failed).
 */
export async function sendTestPush(raw: unknown): Promise<PushResult> {
  const input = IdInput.safeParse(raw)
  if (!input.success) return { ok: false, message: FAILED }
  const session = await panelActionSession('admin')
  if (!session) return { ok: false, message: DENIED }
  const { payload } = session
  try {
    const device = await own(session, input.data.id)
    if (!device) return { ok: false, message: GONE }
    const started = Date.now()
    await notify(
      payload,
      { kind: 'test', push: { kind: 'test' }, email: null, subscription: device.id },
      { runNow: true },
    )
    const after = await payload.findByID({
      collection: 'push-subscriptions',
      id: device.id,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    })
    revalidatePath(PATH)
    if (!after) {
      return {
        ok: false,
        message: 'Przeglądarka odrzuciła to urządzenie — usunięto je z listy. Włącz ponownie.',
      }
    }
    if (after.lastOkAt && Date.parse(after.lastOkAt) >= started - 1000) {
      return { ok: true, message: 'Wysłano — powiadomienie powinno pojawić się za chwilę.' }
    }
    return { ok: false, message: 'Nie udało się wysłać. Spróbuj za chwilę albo włącz ponownie.' }
  } catch (error) {
    log.error({ device: input.data.id, ...errorFields(error) }, 'push: test failed')
    return { ok: false, message: FAILED }
  }
}
