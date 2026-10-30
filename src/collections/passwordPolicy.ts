import { ValidationError } from 'payload'
import type { CollectionBeforeOperationHook, CollectionSlug } from 'payload'

import { passwordProblem } from '../lib/auth/password'

// `updateByID` runs `beforeOperation` with `operation: 'update'`.
const PASSWORD_OPERATIONS = new Set(['create', 'update', 'resetPassword'])

/**
 * Payload hard-codes a 3-character minimum when hashing. `beforeOperation` is the one hook
 * that also runs for `resetPassword` (which skips `beforeValidate`), so the policy lives here.
 * Same policy for panel accounts and customer accounts (`lib/auth/password`).
 */
export function enforcePasswordPolicy(collection: CollectionSlug): CollectionBeforeOperationHook {
  return ({ args, operation, req }) => {
    if (!PASSWORD_OPERATIONS.has(operation)) return args
    const data = 'data' in args ? (args.data as { password?: unknown } | undefined) : undefined
    const problem = passwordProblem(data?.password, { emptyMeansUnchanged: operation === 'update' })
    if (problem) {
      throw new ValidationError({
        collection,
        errors: [{ message: problem, path: 'password' }],
        req,
      })
    }
    return args
  }
}
