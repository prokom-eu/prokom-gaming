import type { Field, GlobalConfig } from 'payload'

import { anyone, adminOnly } from '../access/panel'
import { GROUP_CONTENT } from '../collections/shared'

const text = (name: string, label: string, description?: string): Field => ({
  name,
  label,
  type: 'text',
  ...(description ? { admin: { description } } : {}),
})

const long = (name: string, label: string): Field => ({ name, label, type: 'textarea' })

const EMPTY_HIDES = 'Puste = element nie pokazuje się na stronie.'

/**
 * Facts and promises shown across the site (spec. §1). Values marked [SZEF] in the spec are
 * filled in here by the owner; an empty value is not rendered (spec. §27.7: no placeholders).
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Ustawienia strony',
  admin: { group: GROUP_CONTENT },
  access: { read: anyone, update: adminOnly },
  fields: [
    {
      name: 'company',
      label: 'Firma',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: 'Nazwa', type: 'text', required: true },
            { name: 'nip', label: 'NIP', type: 'text', required: true },
          ],
        },
        { name: 'address', label: 'Adres', type: 'text', required: true },
      ],
    },
    text('salonAddress', 'Salon (adres)'),
    {
      type: 'row',
      fields: [
        text('phone', 'Telefon', EMPTY_HIDES),
        { name: 'email', label: 'E-mail', type: 'email', admin: { description: EMPTY_HIDES } },
      ],
    },
    text('responseTime', 'Odpowiedź na zapytanie'),
    text('since', 'Od kiedy'),
    long('offerTerms', 'Oferta'),
    {
      type: 'row',
      fields: [
        text('fulfilment', 'Realizacja'),
        text('nextFreeSlot', 'Najbliższy wolny termin montażu', EMPTY_HIDES),
      ],
    },
    long('payment', 'Płatność'),
    text('blikMethod', 'BLIK — sposób', EMPTY_HIDES),
    long('delivery', 'Dostawa'),
    text('courier', 'Firma kurierska', EMPTY_HIDES),
    long('warranty', 'Gwarancja PRO-KOM'),
    long('returns', 'Zwrot (opisany neutralnie, nie jako atut)'),
    long('unitTest', 'Test egzemplarza'),
    {
      type: 'row',
      fields: [
        {
          name: 'googleRating',
          label: 'Ocena Google',
          type: 'number',
          min: 1,
          max: 5,
          admin: { description: 'Puste = sekcja opinii ukryta.' },
        },
        { name: 'googleReviewCount', label: 'Liczba opinii Google', type: 'number', min: 0 },
      ],
    },
    {
      name: 'social',
      label: 'Profile',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            text('facebookUrl', 'Facebook (adres)', EMPTY_HIDES),
            text('tiktokUrl', 'TikTok (adres)', EMPTY_HIDES),
          ],
        },
      ],
    },
    {
      name: 'cookieBannerEnabled',
      label: 'Baner cookies',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Włączać tylko z narzędziami wymagającymi zgody (spec. §24).' },
    },
  ],
}
