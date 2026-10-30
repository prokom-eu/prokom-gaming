import type { Metadata } from 'next'
import { connection } from 'next/server'

import { LegalPage } from '@/components/content/LegalPage'
import { loadLegal } from '@/lib/legal.server'

import '@/components/content/content.css'

export const metadata: Metadata = {
  title: 'Regulamin i zwroty',
  description:
    'Zasady kupowania komputerów PRO-KOM Gaming: zapytanie i oferta, płatność, dostawa, zwrot w 14 dni, gwarancja PRO-KOM i reklamacja.',
}

/** „Regulamin i zwroty” (spec. §21, boards Regulamin / Regulamin-telefon). */
export default async function TermsPage() {
  // Edited in the panel without a deploy (spec. §21); the image build has no database.
  await connection()
  return (
    <LegalPage
      scene="wodnik"
      title="Regulamin i zwroty"
      lead="Zasady kupowania komputerów PRO-KOM Gaming: od zapytania, przez płatność i dostawę, po zwrot i gwarancję. Najpierw krótko, potem dokładnie."
      doc={await loadLegal('legal-terms')}
    />
  )
}
