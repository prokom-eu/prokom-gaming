/**
 * One customer = one normalised e-mail across inquiries, orders, units, tickets and accounts
 * (panel spec §6): trimmed and lower case. Payload's auth collections already store it this way.
 */
export function normalizeEmail(value: string): string
export function normalizeEmail(value: unknown): unknown
export function normalizeEmail(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value
}
