import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'

import { InquiryForm } from '@/components/inquiry/InquiryForm'
import { getEnv } from '@/lib/env'
import { hasComputer, initialState, type FormData } from '@/lib/inquiry/form'
import { loadInquiryForm } from '@/lib/inquiry/form.server'
import { issueFormToken } from '@/lib/inquiry/spam'
import { errorFields, log } from '@/lib/logger'
import { routes } from '@/lib/nav'
import { company } from '@/lib/site'

import '@/components/inquiry/inquiry.css'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export const metadata: Metadata = {
  title: 'Zapytanie o komputer',
  description:
    'Trzy krótkie kroki. Odpiszemy z imienną listą części, aktualną ceną i terminem, zwykle w ciągu godziny.',
  // A form, not content: never in search results (spec. §23); links from it are followed.
  robots: { index: false, follow: true },
}

/** The first value of each parameter, as `URLSearchParams` (what `initialState` reads). */
function toParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value
    if (first !== undefined) params.set(key, first)
  }
  return params
}

/**
 * Zapytanie o komputer (spec. §10, boards Formularz / Formularz-telefon). Rendered per request:
 * the offer and prices come from the database, and the signed form token (ADR-G005: at least 3 s
 * between showing and sending) is issued now — no separate request for it.
 */
export default async function InquiryPage({ searchParams }: Props) {
  await connection()
  let data: FormData | null = null
  try {
    data = await loadInquiryForm()
  } catch (error) {
    log.error({ ...errorFields(error) }, 'inquiry form data failed')
  }
  const params = toParams(await searchParams)
  const initial = data ? initialState(params, data) : null

  return (
    <>
      <header className="iq-headline" data-scene-top>
        <div className="wrap">
          <h1 className="h">Zapytanie o komputer</h1>
          <p className="iq-lead">
            Trzy krótkie kroki. Odpiszemy z imienną listą części, aktualną ceną i terminem, zwykle w
            ciągu godziny. Zapytanie nic nie kosztuje i do niczego nie zobowiązuje.
          </p>
          {!data && (
            // TODO(krystian): text for a database outage (not on the board).
            <p className="iq-lead">
              Formularz jest chwilowo niedostępny. Napisz na{' '}
              <a className="lnk" href={`mailto:${company.email}`}>
                {company.email}
              </a>{' '}
              albo zadzwoń:{' '}
              <a className="lnk" href={company.phoneHref}>
                {company.phone}
              </a>
              . Możesz też obejrzeć nasze{' '}
              <Link className="lnk" href={routes.builds}>
                gotowe zestawy
              </Link>
              .
            </p>
          )}
        </div>
      </header>
      {data && initial && (
        <div className="iq-page">
          <div className="wrap">
            <InquiryForm
              // A new address (a draft restored, another „Zapytaj” link) starts a fresh form.
              key={params.toString()}
              data={data}
              initial={initial}
              token={issueFormToken(getEnv().PAYLOAD_SECRET)}
              fromLink={hasComputer(params)}
            />
          </div>
        </div>
      )}
    </>
  )
}
