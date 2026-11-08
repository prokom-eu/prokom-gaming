import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'

import { AuthPage } from '@/components/account/AuthPage'
import { RegisterForm } from '@/components/account/forms'
import { customerSession } from '@/lib/account/session.server'
import { getEnv } from '@/lib/env'
import { issueFormToken } from '@/lib/inquiry/spam'
import { routes } from '@/lib/nav'

export const metadata: Metadata = {
  title: 'Załóż konto',
  robots: { index: false, follow: true },
}

// TODO(krystian): texts of the sign-up page — no board for it.
export default async function RegisterPage() {
  // Per request: the signed form token (spam protection, as in the inquiry form).
  await connection()
  if (await customerSession()) redirect(routes.account)
  return (
    <AuthPage
      title="Załóż konto"
      lead="Konto jest opcjonalne. Podaj ten sam e-mail co w zapytaniu — po nim połączymy Twoje zamówienie, metrykę i gwarancje."
      links={<Link href={routes.accountLogin}>Masz już konto? Zaloguj się</Link>}
    >
      <RegisterForm formToken={issueFormToken(getEnv().PAYLOAD_SECRET)} />
    </AuthPage>
  )
}
