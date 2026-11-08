/**
 * What a push says (ADR-G010 pt 6): a title and one line with the inquiry's number and topic,
 * the screen to open in the data. Never a name, e-mail or phone — the text passes through the
 * browser maker's push service. The payload types have no field for any of them on purpose.
 */

export type PushData =
  | { kind: 'inquiry_new' | 'inquiry_reply'; number: string; topic: string }
  | { kind: 'inquiry_sla'; number: string; topic: string; waited: number }
  | { kind: 'margin_alarm' }
  /** P7: a report id only — the reasons are in the report and in the e-mail. */
  | { kind: 'price_report'; check: number }
  /** „Wyślij próbne” in Settings — to one device. */
  | { kind: 'test' }

export type PushContent = { title: string; body: string; url: string; tag: string }

const MAX_BODY = 80
const line = (text: string) =>
  text.length > MAX_BODY ? `${text.slice(0, MAX_BODY - 1).trimEnd()}…` : text

// TODO(krystian): wording of the notifications (no board; ADR-G010 pt 6 gives the first one).
export function pushContent(data: PushData, admin: string): PushContent {
  switch (data.kind) {
    case 'inquiry_new':
    case 'inquiry_reply':
    case 'inquiry_sla':
      return {
        title:
          data.kind === 'inquiry_sla'
            ? `Bez odpowiedzi od ${data.waited} min`
            : data.kind === 'inquiry_new'
              ? 'Nowe zapytanie'
              : 'Odpowiedź klienta',
        body: line(`${data.number} · ${data.topic}`),
        url: `${admin}/zapytania?nr=${encodeURIComponent(data.number)}`,
        // One notification per inquiry on the lock screen: a newer one replaces the older.
        tag: `inquiry-${data.number}`,
      }
    case 'margin_alarm':
      return {
        title: 'Marża poniżej minimum',
        body: 'Cena na stronie łamie minimum przy dzisiejszych kosztach. Sprawdź ceny.',
        url: `${admin}/ceny/zatwierdzanie`,
        tag: 'margin-alarm',
      }
    case 'price_report':
      return {
        title: 'Raport cen z alarmem',
        body: 'Sprawdzanie cen znalazło zmiany wymagające uwagi. Otwórz raport.',
        url: `${admin}/raporty-cen/${data.check}`,
        tag: 'price-report',
      }
    case 'test':
      return {
        title: 'Próbne powiadomienie',
        body: 'Powiadomienia z panelu działają na tym urządzeniu.',
        url: `${admin}/ustawienia`,
        tag: 'test',
      }
  }
}
