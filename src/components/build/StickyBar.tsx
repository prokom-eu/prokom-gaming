import { Sigil } from '@/components/Sigil'
import { inquiryHref } from '@/lib/buildPage'
import type { BuildPageData } from '@/lib/buildPage.server'
import { zl } from '@/lib/pricing/format'

import { AskLink } from './AskLink'

/**
 * Sticky bar (spec. §6, ADR-G003 §4): sigil, name, price, „Zapytaj o {istotę}”. Desktop: under the
 * hero, it stays at the top while the page scrolls. Phone: always above the tab bar (`stany/tel-05`).
 */
export function StickyBar({ data }: { data: BuildPageData }) {
  const { build } = data
  return (
    <div className="bp-bar" role="region" aria-label={`Zapytaj o ${build.accusative}`}>
      <div className="bp-bar__in">
        <span className="bp-bar__sigil" aria-hidden="true">
          <Sigil id={build.key} size={34} />
        </span>
        <span className="bp-bar__t">
          <b className="nm">{build.name}</b>
          <small>{[build.cpu, build.gpu].filter(Boolean).join(', ')}</small>
        </span>
        {build.price !== null && (
          <span className="bp-bar__p">
            <b>{zl(build.price)}</b>
            <small>z montażem i wysyłką</small>
          </span>
        )}
        <AskLink build={build.slug} href={inquiryHref(build.slug, data.config)}>
          Zapytaj o {build.accusative}
        </AskLink>
      </div>
    </div>
  )
}
