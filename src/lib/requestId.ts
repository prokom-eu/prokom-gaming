/** Request header carrying the id; also returned in the response. */
export const REQUEST_ID_HEADER = 'x-request-id'

// Nginx `$request_id` (32 hex) or a UUID; anything else from the client is replaced, because the
// value is written to logs as it is.
const VALID = /^[A-Za-z0-9-]{8,64}$/

/** The request id from the reverse proxy when well-formed, otherwise a new one. */
export function requestIdFrom(header: string | null | undefined): string {
  return header && VALID.test(header) ? header : crypto.randomUUID()
}
