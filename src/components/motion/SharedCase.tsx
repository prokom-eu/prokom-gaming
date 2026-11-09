import * as React from 'react'
import type { ReactNode } from 'react'

type ViewTransitionProps = {
  name: string
  share?: string
  default?: string
  children: ReactNode
}

/**
 * React 19.3 bundled with the App Router has `<ViewTransition>` (next/dist/docs/01-app/02-guides/
 * view-transitions.md); the root `react` that Vitest renders with does not, so it is looked up,
 * not imported — without it the children render as they are.
 */
const ViewTransition = (
  React as unknown as { ViewTransition?: React.ComponentType<ViewTransitionProps> }
).ViewTransition

/**
 * The case photo of one creature, shared between pages (runda v3 PREMIUM §2.3): going from a card
 * on a list to the build page, the case flies from the card onto its pedestal. Every place shows
 * one creature's case once per page, so the name is unique. `default="none"`: the photo does not
 * take part in any other transition. Without browser support the navigation is a plain one.
 */
export function SharedCase({ slug, children }: { slug: string; children: ReactNode }) {
  if (!ViewTransition) return children
  return (
    <ViewTransition name={`case-${slug}`} share="case-morph" default="none">
      {children}
    </ViewTransition>
  )
}
