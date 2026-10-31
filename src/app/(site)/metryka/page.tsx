import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { normalizeUnitCode } from '@/lib/units'
import { routes } from '@/lib/nav'

import '@/components/account/certificate.css'

export const metadata: Metadata = {
  title: 'Metryka komputera',
  description: 'Wpisz kod z naklejki na obudowie, żeby zobaczyć metrykę swojego komputera.',
  robots: { index: false, follow: true },
}

type Props = { searchParams: Promise<{ kod?: string | string[] }> }

/**
 * `/metryka` without a code (spec. §13): „Wpisz kod z naklejki”. A plain GET form — works without
 * JavaScript; a well-formed code goes to `/metryka/<kod>` (which answers 404 when unknown).
 * No board for this page: layout from the certificate page, TODO(krystian) texts.
 */
export default async function CertificateCodePage({ searchParams }: Props) {
  const raw = (await searchParams).kod
  const typed = Array.isArray(raw) ? raw[0] : raw
  const code = typed ? normalizeUnitCode(typed) : null
  if (code) redirect(`${routes.certificate}/${code}`)

  return (
    <section className="mt">
      <div className="wrap">
        <h1 className="h mt__title">Metryka komputera</h1>
        {/* TODO(krystian): text — no board for this page. */}
        <p className="mt__lead">
          Każdy nasz komputer ma metrykę: wyniki testu, klatki zmierzone na tym egzemplarzu i numery
          seryjne części. Kod znajdziesz na naklejce z kodem QR na obudowie.
        </p>
        <form className="mt-code" action={routes.certificate} method="get">
          <label htmlFor="kod">Wpisz kod z naklejki</label>
          <div className="mt-code__row">
            <input
              id="kod"
              name="kod"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              defaultValue={typed ?? ''}
              aria-describedby={typed ? 'kod-error' : 'kod-hint'}
              aria-invalid={typed ? true : undefined}
              required
            />
            <button type="submit" className="btn">
              Pokaż metrykę
            </button>
          </div>
          {typed ? (
            <p id="kod-error" className="mt-code__error" role="alert">
              To nie wygląda na kod z naklejki. Kod ma 16 znaków, np. 7KQ2-M9XA-B3CD-EFGH.
            </p>
          ) : (
            <p id="kod-hint" className="mt-code__hint">
              16 znaków, wielkość liter i myślniki nie mają znaczenia.
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
