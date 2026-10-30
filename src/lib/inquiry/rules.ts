/**
 * Field rules shared by the server schema (`schema.ts`) and the form (`form.ts`), so the browser
 * rejects exactly what the server would — without shipping Zod to the page.
 */

/**
 * Payload's own e-mail rule (payload 3.91 `fields/validations.js`, field type `email`). Zod 4 lets
 * through e.g. `jan@foo-.pl`; without the same rule here the collection would reject the record
 * after validation and the customer would get 503 instead of 400 `email` (review G6).
 */
export const PAYLOAD_EMAIL =
  /^(?!.*\.\.)[\w!#$%&'*+/=?^`{|}~-](?:[\w!#$%&'*+/=?^`{|}~.-]*[\w!#$%&'*+/=?^`{|}~-])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i

/** At least 6 digits once spaces, brackets and hyphens are gone (not `------`). */
export const isPhone = (value: string) =>
  /^\+?[\d\s()-]+$/.test(value) && value.replace(/\D/g, '').length >= 6

/** Longest texts the API takes (`schema.ts`). */
export const MAX = {
  name: 120,
  email: 254,
  phone: 30,
  nip: 20,
  otherGames: 300,
  customList: 5000,
  message: 5000,
} as const
