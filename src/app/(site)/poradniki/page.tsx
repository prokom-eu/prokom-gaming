import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { GuideCardView } from '@/components/content/GuideCardView'
import { PageHeader } from '@/components/content/PageHeader'
import { GUIDES_PATH, guideList, topicFromParam, type GuideCard } from '@/lib/guides'
import { loadGuideCards } from '@/lib/guides.server'
import { errorFields, log } from '@/lib/logger'

import '@/components/content/content.css'

export const metadata: Metadata = {
  title: 'Poradniki',
  description:
    'Jak wybrać komputer do gier, jaki monitor do niego dobrać i co zrobić po rozpakowaniu. Krótko i po ludzku, od serwisu PRO-KOM w Rabce-Zdroju.',
}

/** „Poradniki” (spec. §20, boards Poradniki / Poradniki-telefon). Topic in the address. */
export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Guides are published in the panel without a deploy; the image build has no database.
  await connection()
  const topic = topicFromParam((await searchParams).temat)
  let guides: GuideCard[] = []
  try {
    guides = await loadGuideCards()
  } catch (error) {
    log.error({ ...errorFields(error) }, 'guides list data failed')
  }
  const { featured, rest, topics } = guideList(guides, topic)

  return (
    <>
      <PageHeader
        scene="baba"
        title="Poradniki"
        lead="Krótko i po ludzku: jak wybrać komputer do gier, jaki monitor do niego dobrać i co zrobić po rozpakowaniu. Piszemy to, co tłumaczymy klientom w sklepie."
      />
      <section className="ct-guides" aria-label="Lista poradników">
        <div className="wrap">
          {/* Topic chips only when there is something to choose between. */}
          {topics.length > 1 && (
            <nav className="ct-guides__topics" aria-label="Tematy">
              <Link className="chip" href={GUIDES_PATH} aria-current={topic ? undefined : 'page'}>
                Wszystkie
              </Link>
              {topics.map((t) => (
                <Link
                  key={t.value}
                  className="chip"
                  href={`${GUIDES_PATH}?temat=${t.param}`}
                  aria-current={topic === t.value ? 'page' : undefined}
                >
                  {t.label}
                </Link>
              ))}
            </nav>
          )}
          {featured ? (
            <div className="ct-guides__featured">
              <GuideCardView guide={featured} featured eager />
            </div>
          ) : (
            // TODO(krystian): text of an empty list (not on the board).
            <p className="ct-p">Pierwsze poradniki już piszemy. Zajrzyj tu za kilka dni.</p>
          )}
          {rest.length > 0 && (
            <div className="ct-guides__grid">
              {rest.map((g) => (
                <GuideCardView key={g.slug} guide={g} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
