// E-mails of the customer account (verify, password reset). Payload sends them through the same
// adapter as inquiries; it takes HTML only, so the text is turned into plain paragraphs.
// TODO(krystian): wording of both e-mails — not on any board.

import { routes } from '../nav'

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c] as string)
}

/** Paragraphs of text; a line that is exactly the link becomes a clickable link. */
function html(paragraphs: string[], link: string): string {
  const body = paragraphs
    .map((p) =>
      p === link
        ? `<p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`
        : `<p>${escapeHtml(p)}</p>`,
    )
    .join('\n')
  return `<!doctype html><html lang="pl"><body style="font-family:Arial,sans-serif;line-height:1.5">${body}</body></html>`
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
  return html(
    [
      greeting(name),
      'kliknij link, żeby potwierdzić adres e-mail i dokończyć zakładanie konta PRO-KOM Gaming:',
      link,
      'Po potwierdzeniu zobaczysz w koncie swoje komputery, ich etap, metrykę i gwarancje.',
      'Jeśli to nie Ty zakładałeś(-aś) konto, zignoruj tę wiadomość.',
      'Pozdrawiamy, PRO-KOM Gaming',
    ],
    link,
  )
}

export function resetEmailHtml({ name, link }: { name: unknown; link: string }): string {
  return html(
    [
      greeting(name),
      'ktoś (pewnie Ty) poprosił o nowe hasło do konta PRO-KOM Gaming. Ustawisz je tutaj — link działa przez godzinę:',
      link,
      'Jeśli to nie Ty, zignoruj tę wiadomość — dotychczasowe hasło dalej działa.',
      'Pozdrawiamy, PRO-KOM Gaming',
    ],
    link,
  )
}
