import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { cache } from 'react'

import { creatureColor, creatureKey, GuideCardView } from '@/components/content/GuideCardView'
import { PageHeader } from '@/components/content/PageHeader'
import { IconUser } from '@/components/icons'
import { JsonLd } from '@/components/JsonLd'
import { Sigil } from '@/components/Sigil'
import { ButtonLink } from '@/components/ui/Button'
import { getEnv } from '@/lib/env'
import {
  categoryLabel,
  GUIDES_PATH,
  guideJsonLd,
  guidePath,
  readingTime,
  relatedGuides,
  type GuideCard,
} from '@/lib/guides'
import { loadGuide, loadGuideCards } from '@/lib/guides.server'
import { dateText } from '@/lib/home'
import { legalHeadings, nodeText, type LegalContent } from '@/lib/legal'
import { buildHref, routes } from '@/lib/nav'
import { menuCreatures } from '@/lib/site'

import '@/components/content/content.css'

type Props = { params: Promise<{ slug: string }> }

// One database read per request for both the metadata and the page.
const guideOf = cache(loadGuide)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = await guideOf((await params).slug)
  if (!guide) return {}
  return { title: guide.title, description: guide.lead }
}

const creatureName = (slug: string) => menuCreatures.find((c) => c.slug === slug)?.name ?? slug

/** A guide (spec. §20, boards Poradnik / Poradnik-telefon). Drafts and unknown slugs → 404. */
export default async function GuidePage({ params }: Props) {
  // Published and edited in the panel without a deploy; the image build has no database.
  await connection()
  const guide = await guideOf((await params).slug)
  if (!guide) notFound()

  let others: GuideCard[] = []
  try {
    others = relatedGuides(await loadGuideCards(), guide)
  } catch {
    // „Czytaj dalej” is optional: the guide itself is already loaded.
  }

  const siteUrl = getEnv().SITE_URL
  const content = guide.content as LegalContent
  const headings = legalHeadings(content)
  const headingOf = (node: unknown) => headings.find((h) => h.node === node)
  const pageUrl = new URL(guidePath(guide.slug), siteUrl).toString()
  // TODO(krystian): wording of the shared message (working text, like „Wyślij rodzicowi”).
  const shareHref = `mailto:?subject=${encodeURIComponent(guide.title)}&body=${encodeURIComponent(
    `${guide.lead}\n\n${pageUrl}`,
  )}`

  const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    heading: ({ node, nodesToJSX }) => {
      const heading = node.tag === 'h2' ? headingOf(node) : undefined
      const Tag = node.tag
      return heading ? (
        <h2 id={heading.id}>{nodeText(node as never)}</h2>
      ) : (
        <Tag>{nodesToJSX({ nodes: node.children })}</Tag>
      )
    },
    // A quote is the „Ściągawka” box of the board.
    quote: ({ node, nodesToJSX }) => (
      <aside className="ct-call">
        <Star />
        <p>{nodesToJSX({ nodes: node.children })}</p>
      </aside>
    ),
  })

  return (
    <>
      <JsonLd
        data={guideJsonLd({
          siteUrl,
          slug: guide.slug,
          title: guide.title,
          lead: guide.lead,
          author: guide.author,
          publishedAt: guide.publishedAt ?? null,
          updatedAt: guide.updatedAt ?? null,
          category: guide.category,
        })}
      />
      <PageHeader
        scene={creatureKey(guide.creature)}
        size="article"
        title={guide.title}
        before={
          <nav className="ct-crumbs" aria-label="Ścieżka">
            <Link href={GUIDES_PATH}>Poradniki</Link>
            <span aria-hidden="true">/</span>
            <span>{categoryLabel(guide.category)}</span>
          </nav>
        }
      >
        <p className="ct-byline">
          <span className="ct-byline__avatar">
            <IconUser size={18} />
          </span>
          <span>
            <b>{guide.author}</b> serwis w Rabce-Zdroju
          </span>
          <span>{readingTime(guide.readingTime)}</span>
          {guide.publishedAt && <span>{dateText(guide.publishedAt)}</span>}
        </p>
      </PageHeader>

      <section className="ct-article" aria-label="Poradnik">
        <div className="wrap ct-article__grid">
          <aside className="ct-article__aside">
            {headings.length > 0 && (
              <nav aria-labelledby="guide-toc">
                <small id="guide-toc">W tym poradniku</small>
                <ol>
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`}>{h.title}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <div className="ct-article__cta">
              <b>Wolisz zapytać?</b>
              <p>Napisz, w co gra dziecko. Odpiszemy z propozycją zwykle w godzinę.</p>
              <ButtonLink href={routes.inquiry} className="ct-wide">
                Zapytaj bez zobowiązań
              </ButtonLink>
            </div>
          </aside>
          <article className="ct-article__body">
            <RichText
              className="ct-article__text"
              data={content as never}
              converters={converters}
            />
            {/* The board puts this box inside the text; the rich text has no place for it, so it
                follows the text (the creatures come from the guide's own field). */}
            {guide.recommended && guide.recommended.length > 0 && (
              <div className="ct-recs">
                <b>Od czego zaczynają nasi klienci</b>
                <div>
                  {guide.recommended.map((r) => (
                    <Link
                      key={r.id ?? r.creature}
                      className="ct-rec"
                      href={buildHref(r.creature)}
                      style={{ '--c': creatureColor(r.creature) } as React.CSSProperties}
                    >
                      <span className="ct-rec__sigil">
                        <Sigil id={creatureKey(r.creature)} size={34} />
                      </span>
                      <span>
                        <b className="nm">{creatureName(r.creature)}</b>
                        <small>{r.note}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="ct-article__end">
              <span>Przydał się poradnik?</span>
              <ButtonLink href={shareHref} variant="ghost">
                Wyślij go komuś
              </ButtonLink>
            </div>
          </article>
        </div>
      </section>

      {others.length > 0 && (
        <section className="ct-more" aria-labelledby="guide-more">
          <div className="wrap">
            <h2 id="guide-more" className="h">
              Czytaj dalej
            </h2>
            <div className="ct-guides__grid">
              {others.map((g) => (
                <GuideCardView key={g.slug} guide={g} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}

function Star() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </svg>
  )
}
