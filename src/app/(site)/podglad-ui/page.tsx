import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { UiPreview } from './UiPreview'

// Development-only preview of base components not yet used on any page (Chip, Segmented,
// BottomSheet, cookie banner) — for axe and keyboard checks. 404 in production builds.
export const metadata: Metadata = {
  title: 'Podgląd komponentów',
  robots: { index: false, follow: false },
}

export default function UiPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <UiPreview />
}
