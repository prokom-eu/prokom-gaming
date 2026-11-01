'use client'

import type { ComponentProps } from 'react'

import { ButtonLink } from '@/components/ui/Button'
import { track } from '@/lib/analytics'

/** „Zapytaj o {istotę}” — a plain link that also counts the click in the statistics (ADR-G009). */
export function AskLink({
  build,
  ...props
}: ComponentProps<typeof ButtonLink> & { build: string }) {
  return <ButtonLink {...props} onClick={() => track('build_ask', { build })} />
}
