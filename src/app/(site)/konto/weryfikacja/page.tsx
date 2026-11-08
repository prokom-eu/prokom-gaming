import config from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { getPayload } from 'payload'

import { AuthPage } from '@/components/account/AuthPage'
import { routes } from '@/lib/nav'

export const metadata: Metadata = {
  title: 'Potwierdzenie adresu e-mail',
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<{ token?: string | string[] }> }

/** Payload's tokens are 40 hex characters (`crypto.randomBytes(20)`); anything else is not one. */
const TOKEN = /^[a-f0-9]{40}$/

async function verify(token: string | undefined): Promise<boolean> {
  if (!token || !TOKEN.test(token)) return false
  try {
    const payload = await getPayload({ config })
    return await payload.verifyEmail({ collection: 'customers', token })
  } catch {
    // Unknown or used token: Payload throws — the page says so, nothing to log.
    return false
  }
}

/** The link from the verification e-mail (Customers `verify`). TODO(krystian): texts. */
export default async function VerifyPage({ searchParams }: Props) {
  await connection()
  const raw = (await searchParams).token
  const ok = await verify(Array.isArray(raw) ? raw[0] : raw)
  return ok ? (
    <AuthPage
      title="Adres potwierdzony"
      lead="Dziękujemy. Teraz możesz się zalogować i zobaczyć swoje komputery."
      links={<Link href={routes.accountLogin}>Zaloguj się</Link>}
    >
      {null}
    </AuthPage>
  ) : (
    <AuthPage
      title="Link nie działa"
      lead="Ten link wygasł albo adres jest już potwierdzony. Spróbuj się zalogować — jeśli się nie uda, załóż konto jeszcze raz albo napisz do nas."
      links={
        <>
          <Link href={routes.accountLogin}>Zaloguj się</Link>
          <Link href={routes.contact}>Kontakt</Link>
        </>
      }
    >
      {null}
    </AuthPage>
  )
}
