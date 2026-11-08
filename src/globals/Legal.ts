import {
  EXPERIMENTAL_TableFeature,
  lexicalEditor,
  type FeatureProviderServer,
} from '@payloadcms/richtext-lexical'
import type { GlobalConfig } from 'payload'

import { anyone, adminOnly } from '../access/panel'
import { GROUP_CONTENT } from '../collections/shared'

/**
 * Editor of the legal texts: the default features plus tables (the privacy policy lists purposes,
 * legal bases and retention as tables — board Prywatnosc). The table feature is marked
 * experimental in Payload 3.91; check it when upgrading together with `prokom-web`.
 */
export const legalFeatures = ({
  defaultFeatures,
}: {
  defaultFeatures: FeatureProviderServer[]
}): FeatureProviderServer[] => [...defaultFeatures, EXPERIMENTAL_TableFeature()]

/**
 * Terms and privacy policy (spec. §21): edited in the panel without a deploy. Each `##` heading
 * of the content is one paragraph („§ 1”…) and one entry of the table of contents.
 */
function legalGlobal(slug: 'legal-terms' | 'legal-privacy', label: string): GlobalConfig {
  return {
    slug,
    label,
    admin: { group: GROUP_CONTENT },
    access: { read: anyone, update: adminOnly },
    fields: [
      {
        name: 'draft',
        label: 'Projekt do weryfikacji przez prawnika',
        type: 'checkbox',
        defaultValue: true,
        admin: {
          description:
            'Zaznaczone = nad treścią napis „Projekt do weryfikacji przez prawnika”. Odznacz po akceptacji prawnika i właściciela.',
        },
      },
      {
        name: 'version',
        label: 'Wersja',
        type: 'text',
        required: true,
        admin: { description: 'Np. 1.0. Zmień przy każdej zmianie treści.' },
      },
      {
        name: 'effectiveDate',
        label: 'Obowiązuje od',
        type: 'date',
        admin: {
          date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
          description: 'Na stronie „Wersja z …”. Puste = linia się nie pokazuje.',
        },
      },
      {
        name: 'summary',
        label: 'W skrócie, po ludzku',
        type: 'array',
        labels: { singular: 'Punkt', plural: 'Punkty' },
        fields: [{ name: 'point', label: 'Punkt', type: 'textarea', required: true }],
      },
      {
        name: 'content',
        label: 'Treść',
        type: 'richText',
        required: true,
        editor: lexicalEditor({ features: legalFeatures }),
        admin: {
          description:
            'Nagłówek H2 = kolejny paragraf (§) i pozycja spisu treści. Cytat = ramka z uwagą.',
        },
      },
    ],
  }
}

export const LegalTerms = legalGlobal('legal-terms', 'Regulamin')
export const LegalPrivacy = legalGlobal('legal-privacy', 'Polityka prywatności')
