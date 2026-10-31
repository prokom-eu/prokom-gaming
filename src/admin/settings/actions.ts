'use server'

import { revalidatePath } from 'next/cache'
import { ValidationError } from 'payload'

import { errorFields, log } from '../../lib/logger'
import { panelActionSession } from '../session'
import { fieldOfPath, keepUnchanged, parseSettingsForm, type FieldErrors } from './form'

export type SaveState =
  | { status: 'idle' }
  | { status: 'saved'; at: string }
  | { status: 'error'; message: string; errors: FieldErrors }

/**
 * "Zapisz zmiany" in /admin/ustawienia, section "Marża i narzuty" (panel spec §13). Admin only.
 * Saves `pricing-settings` through the Local API with the person's access, so Payload validates
 * again (min/max, warning ≥ minimum). A change never reaches the site by itself: the queue
 * recomputes from the new rules and waits for approval (`buildQueue()`, spec §17).
 */
export async function saveSettings(_prev: SaveState, form: FormData): Promise<SaveState> {
  const session = await panelActionSession('admin')
  if (!session) {
    return { status: 'error', message: 'Brak uprawnień — zaloguj się do panelu.', errors: {} }
  }
  const submitted = Object.fromEntries(form.entries())
  const parsed = parseSettingsForm(submitted)
  if (!parsed.ok) {
    return { status: 'error', message: 'Popraw zaznaczone pola.', errors: parsed.errors }
  }
  const { payload, user } = session
  try {
    const stored = await payload.findGlobal({
      slug: 'pricing-settings',
      depth: 0,
      user,
      overrideAccess: false,
    })
    const data = keepUnchanged(parsed.data, stored, submitted)
    await payload.updateGlobal({
      slug: 'pricing-settings',
      data,
      user,
      overrideAccess: false,
      depth: 0,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      const errors: FieldErrors = {}
      for (const e of error.data.errors) {
        const field = fieldOfPath(e.path)
        if (field) errors[field] ??= e.message
      }
      return Object.keys(errors).length
        ? { status: 'error', message: 'Popraw zaznaczone pola.', errors }
        : // TODO(krystian): text — not on the board.
          { status: 'error', message: 'Nie udało się zapisać: dane są niepoprawne.', errors }
    }
    log.error({ ...errorFields(error) }, 'settings: pricing save failed')
    return { status: 'error', message: 'Nie udało się zapisać. Spróbuj ponownie.', errors: {} }
  }
  log.info({ userId: user.id }, 'pricing settings saved')
  revalidatePath('/admin/ustawienia')
  revalidatePath('/admin/ceny')
  return { status: 'saved', at: new Date().toISOString() }
}
