import { RichText, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'

import { IconShield } from '@/components/icons'
import { dateText } from '@/lib/home'
import { legalHeadings, nodeText, type LegalContent } from '@/lib/legal'
import type { LegalTerm } from '@/payload-types'

import { PageHeader } from './PageHeader'

type Props = {
  scene: string
  title: string
  lead: string
  /** The global; `null` when the database did not answer — header and a short note only. */
  doc: LegalTerm | null
}

/**
 * Terms / privacy policy (spec. §21, boards Regulamin / Prywatnosc): table of contents from the
 * `##` headings, „§ n” numbering, the draft notice until the lawyer approves, summary box and the
 * rich text from the panel.
 */
export function LegalPage({ scene, title, lead, doc }: Props) {
  return (
    <>
      <PageHeader scene={scene} title={title} lead={lead} />
      <section className="ct-legal" aria-label={title}>
        <div className="wrap ct-legal__grid">
          {doc ? (
            <LegalBody doc={doc} />
          ) : (
            // TODO(krystian): text when the database does not answer (not on the board).
            <p className="ct-p">Treść jest chwilowo niedostępna. Spróbuj za chwilę.</p>
          )}
        </div>
      </section>
    </>
  )
}

function LegalBody({ doc }: { doc: LegalTerm }) {
  const content: LegalContent = doc.content
  const headings = legalHeadings(content)
  const headingOf = (node: unknown) => headings.find((h) => h.node === node)

  const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    heading: ({ node, nodesToJSX }) => {
      const heading = node.tag === 'h2' ? headingOf(node) : undefined
      if (!heading) {
        const Tag = node.tag
        return <Tag>{nodesToJSX({ nodes: node.children })}</Tag>
      }
      return (
        <h2 id={heading.id}>
          <span className="nm">§ {heading.number}</span>
          {nodeText(node as never)}
        </h2>
      )
    },
    // Own table markup: the default one inlines grey borders and paddings (colours only from
    // tokens, ADR-G003); the wrapper scrolls on a phone.
    table: ({ node, nodesToJSX }) => (
      // Focusable region: on a phone the table scrolls sideways, also from the keyboard.
      <div className="ct-table" role="region" aria-label="Tabela" tabIndex={0}>
        <table>
          <tbody>{nodesToJSX({ nodes: node.children })}</tbody>
        </table>
      </div>
    ),
    tablerow: ({ node, nodesToJSX }) => <tr>{nodesToJSX({ nodes: node.children })}</tr>,
    tablecell: ({ node, nodesToJSX }) => {
      const Cell = node.headerState > 0 ? 'th' : 'td'
      return <Cell>{nodesToJSX({ nodes: node.children })}</Cell>
    },
  })

  return (
    <>
      <nav className="ct-toc" aria-label="Spis treści">
        <small>Spis treści</small>
        <ol>
          {headings.map((h) => (
            <li key={h.id}>
              <a href={`#${h.id}`}>
                <span aria-hidden="true">{h.number}</span>
                {h.title}
              </a>
            </li>
          ))}
        </ol>
        {/* TODO(krystian): „Pobierz jako PDF” (board) — when the lawyer-approved PDF exists. */}
      </nav>
      <article className="ct-doc">
        {doc.draft && (
          <p className="ct-doc__draft">
            <IconShield size={20} />
            <span>
              <b>Projekt do weryfikacji przez prawnika.</b> Treść przygotowana na podstawie ustaleń
              z 24.10.2026 i obowiązujących przepisów. Przed publikacją musi ją sprawdzić prawnik i
              zatwierdzić właściciel firmy.
            </span>
          </p>
        )}
        {doc.summary && doc.summary.length > 0 && (
          <div className="ct-doc__summary">
            <b>W skrócie, po ludzku</b>
            <ul>
              {doc.summary.map((item) => (
                <li key={item.id ?? item.point}>{item.point}</li>
              ))}
            </ul>
          </div>
        )}
        <RichText className="ct-doc__text" data={content as never} converters={converters} />
        {doc.effectiveDate && (
          <p className="ct-doc__version">
            Wersja z {dateText(doc.effectiveDate)}. Poprzednie wersje udostępniamy na prośbę.
          </p>
        )}
      </article>
    </>
  )
}
