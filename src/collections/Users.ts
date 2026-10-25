import { ValidationError } from 'payload'
import type { CollectionBeforeOperationHook, CollectionConfig } from 'payload'

import { passwordProblem } from '../lib/auth/password'
import { GROUP_ADMIN } from './shared'

// `updateByID` runs `beforeOperation` with `operation: 'update'`.
const PASSWORD_OPERATIONS = new Set(['create', 'update', 'resetPassword'])

/**
 * Payload hard-codes a 3-character minimum when hashing. `beforeOperation` is the one hook
 * that also runs for `resetPassword` (which skips `beforeValidate`), so the policy lives here.
 */
const enforcePasswordPolicy: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (!PASSWORD_OPERATIONS.has(operation)) return args
  const data = 'data' in args ? (args.data as { password?: unknown } | undefined) : undefined
  const problem = passwordProblem(data?.password, { emptyMeansUnchanged: operation === 'update' })
  if (problem) {
    throw new ValidationError({
      collection: 'users',
      errors: [{ message: problem, path: 'password' }],
      req,
    })
  }
  return args
}

/**
 * Panel accounts (PRO-KOM staff). Customers log in through a separate `customers` collection
 * (ADR-G005, G14). No roles: every panel user may do everything, and Payload's default access
 * (signed in = allowed) applies.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Użytkownik panelu', plural: 'Użytkownicy panelu' },
  admin: {
    group: GROUP_ADMIN,
    useAsTitle: 'email',
  },
  // ADR-G001 §3: login attempt limit and a short session.
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 2 * 60 * 60,
  },
  hooks: {
    beforeOperation: [enforcePasswordPolicy],
  },
  // Email and password are added by `auth`.
  fields: [],
}
