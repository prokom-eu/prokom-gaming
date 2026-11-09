'use client'

import { usePathname } from 'next/navigation'
import * as React from 'react'
import type { ReactNode } from 'react'

type ViewTransitionProps = {
  enter?: string
  exit?: string
  default?: string
  children: ReactNode
}

/** Looked up, not imported: the root `react` Vitest renders with has no ViewTransition (SharedCase). */
const ViewTransition = (
  React as unknown as { ViewTransition?: React.ComponentType<ViewTransitionProps> }
).ViewTransition

/**
 * Page to page (runda v3 PREMIUM §2.3, F2): the page you leave fades and drifts up, the next one
 * rises from below, while the header, the rail and the tab bar stay put (globals.css `page-out` /
 * `page-in`). Rendered by `(site)/template.tsx`; keyed by the path, because a template alone
 * mounts anew only when the first segment changes — from one creature to another
 * (`/zestawy/wampir` → `/zestawy/strzyga`) it would stay. A new query (`/zestawy?monitor=…`) is
 * the same page: no transition (the filter runs its own). `default="none"`: nothing animates
 * inside a page. A case flying from a list card to its build page (SharedCase) still flies — a
 * named pair wins over enter/exit. Without browser support or with reduced motion: a plain
 * navigation.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (!ViewTransition) return children
  return (
    <ViewTransition key={pathname} enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  )
}
