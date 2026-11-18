/**
 * PRO-KOM lines for the brand bar and the menu chips (MOTYW-PASEK-LINII §4–§5, runda 18.11).
 * A fixed list: Gaming does not read prokom-web's `CompanyData`. Names, addresses and short
 * descriptions copied from prokom-web (`src/seed/shared/company.ts`, `COMPANY_LINES`) — a line
 * changed there must be changed here too. Colours are tokens (`--pk-line-*`, tokens.css, ADR-G003).
 */
export type LineKey = 'prokom' | 'biznes' | 'instalacje' | 'software' | 'tech' | 'gaming'

export type Line = {
  key: LineKey
  name: string
  /** Absolute address of another line; Gaming (this site) links to its own home page. */
  href: string
  /** CSS colour of the line's dash (a token). */
  color: string
  /** The tooltip's short description. */
  description: string
}

/** This site's line: bold, `aria-current`, gold dash. */
export const CURRENT_LINE: LineKey = 'gaming'

/** Order of every PRO-KOM site: PRO-KOM, Biznes, Instalacje, Software, Tech, Gaming last (§2.4). */
export const LINES: readonly Line[] = [
  {
    key: 'prokom',
    name: 'PRO-KOM',
    href: 'https://pro-kom.eu',
    color: 'var(--pk-line-prokom)',
    description: 'Wszystkie linie PRO-KOM',
  },
  {
    key: 'biznes',
    name: 'Biznes',
    href: 'https://prokombiznes.pl',
    color: 'var(--pk-line-biznes)',
    description: 'Kasy, komputery, opieka IT',
  },
  {
    key: 'instalacje',
    name: 'Instalacje',
    href: 'https://prokominstalacje.pl',
    color: 'var(--pk-line-instalacje)',
    description: 'Monitoring, sieci, smart home',
  },
  {
    key: 'software',
    name: 'Software',
    href: 'https://prokomsoftware.pl',
    color: 'var(--pk-line-software)',
    description: 'Strony, systemy, aplikacje',
  },
  {
    key: 'tech',
    name: 'Tech',
    href: 'https://prokomserwis.pl',
    color: 'var(--pk-line-tech)',
    description: 'Naprawy telefonów i komputerów',
  },
  {
    key: 'gaming',
    name: 'Gaming',
    href: '/',
    color: 'var(--grom)',
    description: 'Komputery gamingowe · marka PRO-KOM',
  },
]
