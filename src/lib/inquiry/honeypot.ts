/**
 * Name of the hidden field humans never fill in. Own module: the browser form (G12) needs it,
 * and `spam.ts` uses `node:crypto`, which must stay out of the client bundle.
 */
export const HONEYPOT_FIELD = 'website'

/** Name of the signed "form shown at" token the server renders into the form (G12). */
export const FORM_TOKEN_FIELD = 'formToken'
