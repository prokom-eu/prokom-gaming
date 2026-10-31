import type { Access, CollectionConfig } from 'payload'

import { adminField, adminOnly, isAdmin } from '../access/panel'
import { isCustomer } from '../access/panel'
import {
  RESET_SUBJECT,
  resetEmailHtml,
  resetUrl,
  VERIFY_SUBJECT,
  verifyEmailHtml,
  verifyUrl,
} from '../lib/account/emails'
import { getEnv } from '../lib/env'
import { enforcePasswordPolicy } from './passwordPolicy'
import { limitForgotPassword } from './workshopGuards'
import { GROUP_SALES } from './shared'

/** Admins see every account, a customer only their own. */
const adminOrSelf: Access = ({ req }) => {
  if (isAdmin(req)) return true
  if (isCustomer(req) && req.user) return { id: { equals: req.user.id } }
  return false
}

/**
 * Customer accounts of the site (ADR-G005) — a separate auth collection from panel `users`:
 * separate rules, login attempt limits and sessions; customers never reach `/admin`
 * (`admin.user` is `users`).
 *
 * Creating and editing through the REST API is admin-only on purpose: Payload's `_verified`
 * field lets any signed-in account set it, so a public `create` would let a signed-in customer
 * open a "verified" account on someone else's e-mail. Registration and account edits go through
 * our own routes (`/api/konto/*`) with a fixed list of fields. Login, logout, `me`, verify,
 * forgot and reset password stay Payload's own REST endpoints.
 */
export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Konto klienta', plural: 'Konta klientów' },
  admin: {
    group: GROUP_SALES,
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'createdAt'],
    listSearchableFields: ['email', 'name'],
    description: 'Konta klientów strony. Klient zakłada je sam na /konto/rejestracja.',
  },
  defaultSort: '-createdAt',
  auth: {
    // Same limits as the panel (ADR-G001 §3); a longer session — a customer checks the order now and then.
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 7 * 24 * 60 * 60,
    verify: {
      generateEmailSubject: () => VERIFY_SUBJECT,
      generateEmailHTML: ({ token, user }) =>
        verifyEmailHtml({
          name: (user as { name?: unknown }).name,
          link: verifyUrl(getEnv().SITE_URL, token),
        }),
    },
    forgotPassword: {
      expiration: 60 * 60 * 1000,
      generateEmailSubject: () => RESET_SUBJECT,
      generateEmailHTML: (args) =>
        resetEmailHtml({
          name: (args?.user as { name?: unknown } | undefined)?.name,
          link: resetUrl(getEnv().SITE_URL, args?.token ?? ''),
        }),
    },
  },
  access: {
    read: adminOrSelf,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
    unlock: adminOnly,
  },
  hooks: {
    beforeOperation: [enforcePasswordPolicy('customers'), limitForgotPassword],
  },
  // E-mail and password are added by `auth` (Payload stores the e-mail in lower case).
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', label: 'Imię', type: 'text', required: true, maxLength: 80 },
        { name: 'phone', label: 'Telefon', type: 'text', maxLength: 30 },
      ],
    },
    {
      name: 'consent',
      label: 'Zgoda przy zakładaniu konta',
      type: 'group',
      admin: { readOnly: true },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'clauseVersion', label: 'Wersja klauzuli', type: 'text' },
            { name: 'acceptedAt', label: 'Zaakceptowano', type: 'date' },
          ],
        },
      ],
    },
    {
      name: 'savedConfigs',
      label: 'Zapisane konfiguracje',
      type: 'array',
      maxRows: 20,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', label: 'Nazwa', type: 'text', required: true, maxLength: 80 },
            // Five codes as in the configurator address (`k=`, `lib/configurator.ts`).
            { name: 'k', label: 'Kody (k=)', type: 'text', required: true, maxLength: 120 },
            { name: 'light', label: 'Światło', type: 'text', maxLength: 20 },
            { name: 'savedAt', label: 'Zapisano', type: 'date', required: true },
          ],
        },
      ],
    },
    {
      name: 'favorites',
      label: 'Ulubione zestawy',
      type: 'relationship',
      relationTo: 'builds',
      hasMany: true,
      maxRows: 16,
    },
    {
      name: 'notes',
      label: 'Notatki o kliencie (tylko panel)',
      type: 'textarea',
      ...adminField,
    },
  ],
}
