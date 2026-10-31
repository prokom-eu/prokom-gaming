import type {
  Access,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
} from 'payload'

import { isAdmin, isPanelUser, USER_ROLES } from '../access/panel'
import { enforcePasswordPolicy } from './passwordPolicy'
import { GROUP_ADMIN } from './shared'

/**
 * A deleted panel account takes its push devices with it (P4): `push-subscriptions.user` is
 * required, so the database's `set null` would refuse the delete.
 */
const deleteDevices: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({
    collection: 'push-subscriptions',
    where: { user: { equals: id } },
    overrideAccess: true,
    req,
  })
}

/**
 * The very first account (`/admin/create-first-user`, nobody signed in) must be an admin, or no one
 * could ever grant roles. Every later account keeps what an admin chose (default `serwis`).
 */
const firstUserIsAdmin: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true, req })
  return totalDocs === 0 ? { ...data, role: 'admin' } : data
}

/** Admins see every account; anyone else on the panel only their own. */
const adminOrSelf: Access = ({ req }) => {
  if (isAdmin(req)) return true
  if (isPanelUser(req) && req.user) return { id: { equals: req.user.id } }
  return false
}

/**
 * Panel accounts (PRO-KOM staff), roles `admin` and `serwis` (panel spec §15). Customers log in
 * through the separate `customers` collection (ADR-G005) and never pass these rules: Payload's
 * default ("signed in = allowed") would let a signed-in customer list or even create panel accounts.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Użytkownik panelu', plural: 'Użytkownicy panelu' },
  admin: {
    group: GROUP_ADMIN,
    useAsTitle: 'email',
    defaultColumns: ['email', 'role'],
  },
  // ADR-G001 §3: login attempt limit and a short session.
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 2 * 60 * 60,
  },
  access: {
    admin: ({ req }) => isPanelUser(req),
    read: adminOrSelf,
    create: ({ req }) => isAdmin(req),
    update: adminOrSelf,
    delete: ({ req }) => isAdmin(req),
    unlock: ({ req }) => isAdmin(req),
  },
  hooks: {
    beforeOperation: [enforcePasswordPolicy('users')],
    beforeChange: [firstUserIsAdmin],
    beforeDelete: [deleteDevices],
  },
  // Email and password are added by `auth`.
  fields: [
    {
      name: 'role',
      label: 'Rola',
      type: 'select',
      required: true,
      // New accounts get the narrower role; the G14 migration made existing accounts admins.
      defaultValue: 'serwis',
      options: USER_ROLES.map(({ value, label }) => ({ value, label })),
      // Only an admin changes roles — a `serwis` account editing itself cannot promote itself.
      access: { create: ({ req }) => isAdmin(req), update: ({ req }) => isAdmin(req) },
      // `saveToJWT` keeps the role on `req.user` for the access checks above.
      saveToJWT: true,
      admin: { position: 'sidebar' },
    },
  ],
}
