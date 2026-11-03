// E-mails of the customer account (verify, password reset). Payload sends them through the same
// adapter as inquiries; it takes HTML only — the brand layout with the mark set in text.
// TODO(krystian): wording of both e-mails — not on any board.

import { mailFooter, originOf } from '../mail/brand'
import { renderMail } from '../mail/layout'
import { routes } from '../nav'

/**
 * One account e-mail in the brand layout. Payload sends these without attachments, so the mark is
 * set in text (`textLogo`). The link is a button and, below it, plain text to copy.
 */
function accountMail(input: {
  preheader: string
  title: string
  greeting: string
  lead: string
  button: string
  link: string
  after: string
  note: string
}): string {
  const siteUrl = originOf(input.link)
  return renderMail({
    preheader: input.preheader,
    tagLabel: 'Konto PRO-KOM Gaming',
    title: input.title,
    lead: `${input.greeting} ${input.lead}`,
    blocks: [
      { kind: 'buttons', buttons: [{ label: input.button, href: input.link, primary: true }] },
      { kind: 'paragraph', text: input.after },
      {
        kind: 'callout',
        title: 'Przycisk nie działa?',
        text: `Skopiuj ten adres do przeglądarki:
${input.link}`,
      },
    ],
    footer: mailFooter(siteUrl, input.note),
    textLogo: true,
  }).html
}

function greeting(name: unknown): string {
  return typeof name === 'string' && name.trim() ? `Cześć ${name.trim()},` : 'Cześć,'
}

/** Link the verification e-mail points to: the account page confirms the token. */
export function verifyUrl(siteUrl: string, token: string): string {
  const url = new URL(routes.accountVerify, siteUrl)
  url.searchParams.set('token', token)
  return url.toString()
}

/** Link of the reset e-mail: the page with the new-password form. */
export function resetUrl(siteUrl: string, token: string): string {
  const url = new URL(routes.accountPassword, siteUrl)
  url.searchParams.set('token', token)
  return url.toString()
}

export const VERIFY_SUBJECT = 'Potwierdź adres e-mail — konto PRO-KOM Gaming'
export const RESET_SUBJECT = 'Nowe hasło do konta PRO-KOM Gaming'

export function verifyEmailHtml({ name, link }: { name: unknown; link: string }): string {
  return accountMail({
    preheader: 'Jedno kliknięcie i konto jest gotowe.',
    title: 'Potwierdź adres e-mail',
    greeting: greeting(name),
    lead: 'kliknij przycisk, żeby potwierdzić adres e-mail i dokończyć zakładanie konta PRO-KOM Gaming.',
    button: 'Potwierdzam adres',
    link,
    after: 'Po potwierdzeniu zobaczysz w koncie swoje komputery, ich etap, metrykę i gwarancje.',
    note: 'Jeśli to nie Ty zakładałeś(-aś) konto, zignoruj tę wiadomość.',
  })
}

export function resetEmailHtml({ name, link }: { name: unknown; link: string }): string {
  return accountMail({
    preheader: 'Link do nowego hasła działa przez godzinę.',
    title: 'Ustaw nowe hasło',
    greeting: greeting(name),
    lead: 'ktoś (pewnie Ty) poprosił o nowe hasło do konta PRO-KOM Gaming. Ustawisz je przyciskiem niżej — link działa przez godzinę.',
    button: 'Ustawiam nowe hasło',
    link,
    after: 'Po zmianie zalogujesz się nowym hasłem na każdym urządzeniu.',
    note: 'Jeśli to nie Ty, zignoruj tę wiadomość — dotychczasowe hasło dalej działa.',
  })
}

export const PANEL_RESET_SUBJECT = 'Nowe hasło do panelu PRO-KOM Gaming'

/** Reset of a panel account (Users): the admin's own reset page; same look as the customer's. */
export function panelResetEmailHtml({ link }: { link: string }): string {
  return accountMail({
    preheader: 'Link do nowego hasła do panelu działa przez godzinę.',
    title: 'Nowe hasło do panelu',
    greeting: 'Cześć,',
    lead: 'ktoś (pewnie Ty) poprosił o nowe hasło do panelu PRO-KOM Gaming. Ustawisz je przyciskiem niżej — link działa przez godzinę.',
    button: 'Ustawiam nowe hasło',
    link,
    after: 'Panel jest tylko dla zespołu PRO-KOM Gaming.',
    note: 'Jeśli to nie Ty, zignoruj tę wiadomość i daj znać administratorowi — dotychczasowe hasło dalej działa.',
  })
}

/** Link of the panel reset: Payload's own reset page (`/admin/reset/<token>`). */
export function panelResetUrl(
  siteUrl: string,
  adminRoute: string,
  resetRoute: string,
  token: string,
) {
  return new URL(`${adminRoute}${resetRoute}/${encodeURIComponent(token)}`, siteUrl).toString()
}
