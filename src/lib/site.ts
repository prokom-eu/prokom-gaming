import creaturesSeed from '../../seed/prokomgaming/creatures.json'

// Shell data, static for now. The `site-settings` global and `builds` exist since G3 (seed values
// = these), but reading them in the layout changes how pages render (`docker build` has no
// database), so it waits for the first page with data.
// TODO(krystian): G7 — read company, contact and the cookie flag from `site-settings`
// (spec. §1), creatures from `builds`. One shop, in Rabka-Zdrój; phone and e-mail confirmed by
// Krystian on 01.11.2026 (no salon in Zakopane).

export const company = {
  name: 'PRO-KOM Tadeusz Wójciak',
  address: 'ul. Orkana 16B, 34-700 Rabka-Zdrój',
  // The same address in parts, for structured data (PostalAddress).
  postal: { street: 'ul. Orkana 16B', code: '34-700', city: 'Rabka-Zdrój' },
  nip: '735-251-14-47',
  email: 'kontakt@prokomgaming.pl',
  phone: '+48 883 200 151',
  phoneHref: 'tel:+48883200151',
  // Gaming is a product brand of PRO-KOM (docs/zadania/gaming-marka-prokom.md).
  parentSite: { label: 'pro-kom.eu', href: 'https://pro-kom.eu' },
} as const

// Public registers where a customer checks the company (spec. §16, boards Rodzice, OFirmie).
export const registers = {
  ceidg: 'https://aplikacja.ceidg.gov.pl/ceidg/ceidg.public.ui/search.aspx',
  vatList: 'https://www.podatki.gov.pl/wykaz-podatnikow-vat-wyszukiwarka/',
} as const

// Profile addresses unknown yet: an empty value hides the link (no placeholder in HTML, spec. §27.7).
export const social: { label: string; href: string }[] = [
  { label: 'Facebook', href: '' }, // TODO(krystian): Facebook profile address
  { label: 'TikTok', href: '' }, // TODO(krystian): TikTok profile address
]

// Cookie banner only when tools needing consent are on (spec. §3, §24): none at launch.
export const cookieBannerEnabled = false

export type MenuCreature = {
  slug: string
  /** Key of the sigil and scene files in /public (e.g. `baba` for Baba Jaga). */
  id: string
  name: string
}

// 16 creatures in price order (seed order). Price "from" comes with published prices in G4.
export const menuCreatures: MenuCreature[] = creaturesSeed.items.map(({ slug, id, name }) => ({
  slug,
  id,
  name,
}))
