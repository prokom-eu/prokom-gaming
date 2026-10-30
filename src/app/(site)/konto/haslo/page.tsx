import type { Metadata } from 'next'
import Link from 'next/link'

import { AuthPage } from '@/components/account/AuthPage'
import { ForgotForm, ResetForm } from '@/components/account/forms'
import { routes } from '@/lib/nav'

export const metadata: Metadata = {
  title: 'Nowe hasło',
  robots: { index: false, follow: false },
}

type Props = { searchParams: Promise<{ token?: string | string[] }> }

/**
 * Without a token: „Nie pamiętam hasła” (e-mail with a link). With the token from that e-mail:
 * the new password. TODO(krystian): texts — no board for this page.
 */
export default async function PasswordPage({ searchParams }: Props) {
  const raw = (await searchParams).token
  const token = Array.isArray(raw) ? raw[0] : raw
  if (token) {
    return (
      <AuthPage title="Ustaw nowe hasło">
        <ResetForm token={token} />
      </AuthPage>
    )
  }
  return (
    <AuthPage
      title="Nie pamiętasz hasła?"
      lead="Podaj e-mail konta — wyślemy link do ustawienia nowego hasła."
      links={<Link href={routes.accountLogin}>Wróć do logowania</Link>}
    >
      <ForgotForm />
    </AuthPage>
  )
}
