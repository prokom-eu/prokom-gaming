/**
 * The privacy clause next to the consent checkbox (ADR-G005), 1:1 from the Formularz board. Every
 * inquiry stores the version it was accepted with, so changing the text means a new `version`
 * here — git keeps the old wording for the record.
 */
export const CONSENT_CLAUSE = {
  version: '2026-10-27',
  // TODO(krystian): confirm with the lawyer together with the privacy policy (spec. §25).
  text:
    'Zgadzam się na kontakt w sprawie oferty. Administratorem danych jest PRO-KOM Tadeusz ' +
    'Wójciak, szczegóły w polityce prywatności.',
} as const

/**
 * Clause of „Krótkie pytanie?” on `/kontakt` (board Kontakt), own version: the record keeps which
 * wording was accepted. The board ends at the administrator; the link to the privacy policy is
 * added like in the form (information duty, RODO art. 13).
 */
export const CONTACT_CONSENT_CLAUSE = {
  version: '2026-10-30-kontakt',
  // TODO(krystian): confirm with the lawyer together with the privacy policy (spec. §25).
  text:
    'Zgadzam się na kontakt w sprawie mojej wiadomości. Administratorem danych jest PRO-KOM ' +
    'Tadeusz Wójciak, szczegóły w polityce prywatności.',
} as const

/** Versions `POST /api/inquiry` accepts: the clauses shown on the site today. */
export const CONSENT_VERSIONS = [CONSENT_CLAUSE.version, CONTACT_CONSENT_CLAUSE.version] as const

/**
 * Consent when a customer sets up an account (G14). Not on any board, own version: the account
 * keeps which wording was accepted.
 */
export const ACCOUNT_CONSENT_CLAUSE = {
  version: '2026-10-31-konto',
  // TODO(krystian): wording with the lawyer together with the terms and the privacy policy (spec. §25).
  text:
    'Akceptuję regulamin konta. Administratorem danych jest PRO-KOM Tadeusz Wójciak, ' +
    'szczegóły w polityce prywatności.',
} as const
