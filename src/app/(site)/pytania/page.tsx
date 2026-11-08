import type { Metadata } from 'next'
import { connection } from 'next/server'

import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd'
import { FaqBrowser } from '@/components/content/FaqBrowser'
import { PageHeader } from '@/components/content/PageHeader'
import { JsonLd } from '@/components/JsonLd'
import { ButtonLink } from '@/components/ui/Button'
import { faqPageJsonLd, type FaqSection } from '@/lib/faq'
import { loadFaq } from '@/lib/faq.server'
import { errorFields, log } from '@/lib/logger'
import { routes } from '@/lib/nav'

import '@/components/content/content.css'

export const metadata: Metadata = {
  title: 'Pytania i odpowiedzi',
  description:
    'Zakup i płatność, dostawa, zwroty i gwarancja, klatki w grach i pytania rodziców: odpowiedzi PRO-KOM Gaming w jednym miejscu.',
  alternates: { canonical: routes.faq },
}

/** „Pytania i odpowiedzi” (spec. §19, boards FAQ / FAQ-telefon). */
export default async function FaqPage() {
  // Questions are edited in the panel (no deploy), and the image build has no database.
  await connection()
  let sections: FaqSection[] = []
  try {
    sections = await loadFaq()
  } catch (error) {
    log.error({ ...errorFields(error) }, 'faq page data failed')
  }

  return (
    <>
      <BreadcrumbJsonLd crumbs={[{ name: 'Pytania i odpowiedzi', path: routes.faq }]} />
      {sections.length > 0 && <JsonLd data={faqPageJsonLd(sections)} />}
      <PageHeader
        scene="licho"
        title="Pytania i odpowiedzi"
        lead="Wszystko o kupowaniu, dostawie, zwrotach, gwarancji i klatkach w jednym miejscu. Nie ma Twojego pytania? Napisz, odpowiemy zwykle w godzinę."
      />
      <section className="ct-sec ct-sec--faq" aria-label="Pytania">
        <div className="wrap">
          <FaqBrowser
            sections={sections}
            aside={
              <div className="ct-faq__help">
                <b>Nie znalazłeś odpowiedzi?</b>
                <p>Odpisujemy codziennie od 8 do 22.</p>
                <ButtonLink href={routes.contact} className="ct-wide">
                  Napisz do nas
                </ButtonLink>
              </div>
            }
          />
        </div>
      </section>
    </>
  )
}
