import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'

import { AuthPage } from '@/components/account/AuthPage'
import { LoginForm } from '@/components/account/forms'
import { customerSession } from '@/lib/account/session.server'
import { routes } from '@/lib/nav'

export const metadata: Metadata = {
  title: 'Logowanie do konta',
  robots: { index: false, follow: true },
}

// TODO(krystian): texts of the sign-in pages — no board for them.
export default async function LoginPage() {
  await connection()
  if (await customerSession()) redirect(routes.account)
  return (
    <AuthPage
      title="Zaloguj się"
      lead="Zobaczysz etap swojego zamówienia, metrykę, gwarancje i zgłoszenia."
      links={
        <>
          <Link href={routes.accountRegister}>Nie masz konta? Załóż je</Link>
          <Link href={routes.accountPassword}>Nie pamiętam hasła</Link>
        </>
      }
    >
      <LoginForm />
    </AuthPage>
  )
}
