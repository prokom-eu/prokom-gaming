import type { ReactNode } from 'react'

import '@/components/inquiry/inquiry.css'
import '@/components/account/certificate.css'
import '@/components/account/account.css'

/**
 * Frame of the sign-in pages (`/konto/logowanie`, `rejestracja`, `haslo`, `weryfikacja`). No board
 * draws them: the certificate page's layout with the inquiry form's fields (decision 31.10.2026).
 */
export function AuthPage({
  title,
  lead,
  children,
  links,
}: {
  title: string
  lead?: ReactNode
  children: ReactNode
  links?: ReactNode
}) {
  return (
    <section className="mt">
      <div className="wrap kt-auth">
        <h1 className="h mt__title">{title}</h1>
        {lead && <p className="mt__lead">{lead}</p>}
        {children}
        {links && <p className="kt-auth__links">{links}</p>}
      </div>
    </section>
  )
}
