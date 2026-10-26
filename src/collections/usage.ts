import { APIError, ValidationError } from 'payload'
import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  PayloadRequest,
  Where,
} from 'payload'

/**
 * Parts used in a build recipe (ADR-G002 §2) cannot disappear from under it:
 * - deleting one would hit `NOT NULL` foreign keys in `builds` → a 500 with Postgres' text;
 * - deactivating an option drops the build out of the margin guard (it reviews active options).
 */

type BuildSlot = 'level' | 'case' | 'cooler' | 'ram' | 'ssd'

/** Names of the builds that use the document `id` in any of the given slots. */
export async function buildsUsing(
  req: PayloadRequest,
  slots: readonly BuildSlot[],
  id: number | string,
): Promise<string[]> {
  const where: Where = { or: slots.map((slot) => ({ [slot]: { equals: id } })) }
  const found = await req.payload.find({
    collection: 'builds',
    where,
    select: { name: true },
    sort: 'name',
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return found.docs.map((b) => b.name)
}

export function blockDeleteWhenUsed(
  slots: readonly BuildSlot[],
  hint: string,
): CollectionBeforeDeleteHook {
  return async ({ id, req }) => {
    const builds = await buildsUsing(req, slots, id)
    if (builds.length > 0) {
      // Public message: the panel shows it instead of a generic error.
      throw new APIError(
        `Nie można usunąć — używane w zestawie: ${builds.join(', ')}. ${hint}`,
        400,
        null,
        true,
      )
    }
  }
}

/** Options only: switching "Aktywna" off is refused while a build uses the option. */
export const blockDeactivateWhenUsed: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  if (operation !== 'update' || data.active !== false || originalDoc?.active === false) return data
  const builds = await buildsUsing(req, ['case', 'cooler', 'ram', 'ssd'], originalDoc.id)
  if (builds.length > 0) {
    throw new ValidationError(
      {
        collection: 'options',
        errors: [
          {
            path: 'active',
            message: `Opcja jest w zestawie: ${builds.join(', ')}. Najpierw zmień zestaw — inaczej wypadłby ze sprawdzania marży.`,
          },
        ],
      },
      req.t,
    )
  }
  return data
}
