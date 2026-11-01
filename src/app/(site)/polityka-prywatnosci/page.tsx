import type { Metadata } from 'next'
import { connection } from 'next/server'

import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd'
import { LegalPage } from '@/components/content/LegalPage'
import { loadLegal } from '@/lib/legal.server'
import { routes } from '@/lib/nav'

import '@/components/content/content.css'

export const metadata: Metadata = {
  title: 'Polityka prywatności i cookies',
  description:
    'Jakie dane zbiera PRO-KOM Gaming, po co, jak długo je trzymamy i jak możesz je zmienić albo usunąć. Cookies tylko za zgodą.',
  alternates: { canonical: routes.privacy },
}

/**
 * „Polityka prywatności i cookies” (spec. §21, boards Prywatnosc / Prywatnosc-telefon). The
 * board's cookie switches wait for the first tool that needs consent (spec. §24: none at launch,
 * banner off) — G15.
 */
export default async function PrivacyPage() {
  // Edited in the panel without a deploy (spec. §21); the image build has no database.
  await connection()
  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[{ name: 'Polityka prywatności i cookies', path: routes.privacy }]}
      />
      <LegalPage
        scene="kikimora"
        title="Polityka prywatności i cookies"
        lead="Jakie dane zbieramy, po co, jak długo je trzymamy i jak możesz je zmienić albo usunąć. Bez prawniczego szumu."
        doc={await loadLegal('legal-privacy')}
      />
    </>
  )
}
