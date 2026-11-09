import type { ReactNode } from 'react'

import { PageTransition } from '@/components/motion/PageTransition'

/** A template (not the layout) mounts anew on every navigation: the page transition's hook. */
export default function SiteTemplate({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>
}
