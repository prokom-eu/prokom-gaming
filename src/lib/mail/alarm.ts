/** Slug of the job that reads the Gaming mailbox (ADR-G008 pt 2). */
export const MAIL_INTAKE_TASK = 'mail-intake'

/**
 * The `mail_error` alarm (panel spec §14): reading the mailbox failed 3 times in a row. Technical
 * only — no addresses, subjects or message text. Push on the phone comes with `notify()` (P4 PR 2).
 */
export function mailErrorEmail({ to, settingsUrl }: { to: string; settingsUrl: string }) {
  return {
    to,
    // TODO(krystian): wording of the mail-reading alarm.
    subject: 'Odbiór poczty zapytań nie działa',
    text: [
      'Panel trzy razy z rzędu nie odczytał skrzynki Gaming (IMAP).',
      'Odpowiedzi klientów nie trafiają teraz do wątków zapytań — sprawdzaj pocztę ręcznie.',
      '',
      `Stan odbioru: ${settingsUrl}`,
    ].join('\n'),
  }
}
