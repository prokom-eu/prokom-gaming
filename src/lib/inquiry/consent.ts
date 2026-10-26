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
