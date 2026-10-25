'use client'

import './(site)/globals.css'

type Props = { error: Error & { digest?: string }; retry: () => void }

// Error in a root layout: replaces the whole document (Next docs), so no header and no shell.
// Kept minimal on purpose; nothing here can fail. TODO(krystian): colours from tokens.css in G2.
export default function GlobalError({ error, retry }: Props) {
  return (
    <html lang="pl">
      <body>
        <title>Błąd — PRO-KOM Gaming</title>
        <main className="mx-auto max-w-2xl px-4 py-24">
          <h1 className="text-3xl font-bold">Coś poszło nie tak</h1>
          <p className="mt-4 text-lg leading-relaxed">
            Nie udało się wyświetlić strony. Spróbuj ponownie za chwilę.
          </p>
          {error.digest && <p className="mt-2 text-sm">Kod błędu: {error.digest}</p>}
          <button
            type="button"
            onClick={() => retry()}
            className="mt-8 min-h-11 rounded-xl border px-6 py-2.5 font-bold"
          >
            Spróbuj ponownie
          </button>
        </main>
      </body>
    </html>
  )
}
