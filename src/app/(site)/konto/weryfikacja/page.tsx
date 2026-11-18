import config from '@payload-config'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { getPayload } from 'payload'

import { AuthPage } from '@/components/account/AuthPage'
import { verifyAndStartPasswordSetup } from '@/lib/account/verify.server'
import { routes } from '@/lib/nav'

export const metadata: Metadata = {
  title: 'Potwierdzenie adresu e-mail',
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<{ token?: string | string[] }> }

/** The link from the verification e-mail (Customers `verify`). TODO(krystian): texts. */
export default async function VerifyPage({ searchParams }: Props) {
  await connection()
  const raw = (await searchParams).token
  const payload = await getPayload({ config })
  const result = await verifyAndStartPasswordSetup(payload, Array.isArray(raw) ? raw[0] : raw)
  // Audit AB4 (G-01): the mailbox owner sets the password right after confirming the address.
  if (result.ok && result.resetToken) {
    redirect(`${routes.accountPassword}?token=${encodeURIComponent(result.resetToken)}`)
  }
  return result.ok ? (
    <AuthPage
      title="Adres potwierdzony"
      lead="Dziękujemy. Ustaw teraz hasło do konta przez „Nie pamiętam hasła” — wyślemy link na ten adres."
      links={<Link href={routes.accountPassword}>Ustaw hasło</Link>}
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
