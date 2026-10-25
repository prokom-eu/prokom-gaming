import creaturesSeed from '../../seed/prokomgaming/creatures.json'

// Shell data, static for now. The `site-settings` global and `builds` exist since G3 (seed values
// = these), but reading them in the layout changes how pages render (`docker build` has no
// database), so it waits for the first page with data.
// TODO(krystian): G7 — read company, contact and the cookie flag from `site-settings`
// (spec. §1), creatures from `builds`. Phone and e-mail are spec. §1 start values still marked
// [SZEF]; they are shown until the boss confirms or changes them in the panel.

export const company = {
  name: 'PRO-KOM Tadeusz Wójciak',
  address: 'ul. Orkana 16B, 34-700 Rabka-Zdrój',
  salon: 'ul. Staszica 8, Zakopane',
  nip: '735-251-14-47',
  // [SZEF] mailbox to be created and phone to be confirmed for Gaming (spec. §1).
  email: 'gaming@pro-kom.eu',
  phone: '+48 18 267 65 11',
  phoneHref: 'tel:+48182676511',
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
