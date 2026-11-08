'use client'

import type { ReactNode } from 'react'

/**
 * „Pobierz metrykę w PDF”: the browser's print dialog, where "Save as PDF" makes the file
 * (decision 31.10.2026 — no PDF library). The print stylesheet keeps the certificate only.
 */
export function PrintButton({ children }: { children: ReactNode }) {
  return (
    <button type="button" className="btn" onClick={() => window.print()}>
      {children}
    </button>
  )
}
