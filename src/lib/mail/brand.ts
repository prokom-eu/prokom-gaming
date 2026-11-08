import { company } from '../site'
import type { MailInput } from './layout'

/** Shared pieces of every Gaming e-mail: footer, phone button, signature (board 09). */

export const DEFAULT_SITE_URL = 'https://prokomgaming.pl'

/** The site's origin from any absolute link (e.g. the panel link); the default when it is not one. */
export function originOf(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return DEFAULT_SITE_URL
  }
}

const hostOf = (siteUrl: string) => siteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')

export function mailFooter(siteUrl: string, note?: string): MailInput['footer'] {
  const site = siteUrl.replace(/\/+$/, '')
  return {
    contact: [
      { label: 'Telefon', value: company.phone, href: company.phoneHref },
      { label: 'E-mail', value: company.email, href: `mailto:${company.email}` },
      { label: 'Sklep', value: company.address },
      { label: 'Strona', value: hostOf(siteUrl), href: site },
    ],
    links: [
      { label: 'Zestawy', href: `${site}/zestawy` },
      { label: 'Konfigurator', href: `${site}/konfigurator` },
      { label: 'Pytania', href: `${site}/pytania` },
      { label: 'Polityka prywatności', href: `${site}/polityka-prywatnosci` },
    ],
    legal: [`${company.name} · NIP ${company.nip}`, 'PRO-KOM Gaming to marka PRO-KOM · pro-kom.eu'],
    note,
  }
}

export const phoneButton = {
  label: `Zadzwoń ${company.phone.replace('+48 ', '')}`,
  href: company.phoneHref,
}

/** Signature lines from the panel (`mail-settings.signature`), else the company default. */
export function signatureLines(signature: string | null | undefined, siteUrl: string): string[] {
  const own = (signature ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (own.length > 0) return own
  return [
    'PRO-KOM Gaming',
    `${company.phone} · ${company.email}`,
    `${hostOf(siteUrl)} · Rabka-Zdrój`,
  ]
}
