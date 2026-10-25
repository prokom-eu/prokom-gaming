'use client'

import './(site)/globals.css'

// `unknown`: a value thrown in a Client Component arrives as it is and may not be an `Error`
// (Next docs, error.md), so `digest` is read only after narrowing.
type Props = { error: unknown; retry: () => void }

function digestOf(error: unknown): string | undefined {
  if (!(error instanceof Error) || !('digest' in error)) return undefined
  return typeof error.digest === 'string' ? error.digest : undefined
}

// Error in a root layout: replaces the whole document (Next docs), so no header, no shell and
// no next/font — the token fonts fall back to Georgia / system-ui. Nothing here can fail.
export default function GlobalError({ error, retry }: Props) {
  const digest = digestOf(error)
  return (
    <html lang="pl">
      <body>
        <title>Błąd — PRO-KOM Gaming</title>
        <main className="wrap py-24">
          <h1 className="h text-kosc-hi text-5xl">Coś poszło nie tak</h1>
          <p className="text-lead mt-4 text-lg leading-relaxed">
            Nie udało się wyświetlić strony. Spróbuj ponownie za chwilę.
          </p>
          {digest && <p className="text-mgla mt-2 text-sm">Kod błędu: {digest}</p>}
          <button type="button" onClick={() => retry()} className="btn mt-8">
            Spróbuj ponownie
          </button>
        </main>
      </body>
    </html>
  )
}
