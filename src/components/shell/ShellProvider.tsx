'use client'

import { usePathname } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { readCount, storageKeys, subscribeStorage } from '@/lib/storage'

type Shell = {
  menuOpen: boolean
  openMenu: () => void
  closeMenu: () => void
  /** Builds in the comparison (0–3). */
  compareCount: number
  /** Items in the inquiry. */
  inquiryCount: number
}

const ShellContext = createContext<Shell | null>(null)

// The server and the first client render show 0; real counts come right after hydration.
const zero = () => 0

/**
 * Shared state of the shell: one menu sheet opened from the tab bar (phone) or the hamburger
 * (tablet), and the comparison / inquiry counters from localStorage. Pages stay Server
 * Components — only the shell pieces read this context.
 */
export function ShellProvider({ children }: { children: ReactNode }) {
  const [menuOpenAt, setMenuOpenAt] = useState<string | null>(null)
  const pathname = usePathname()

  // The menu belongs to the page it was opened on: navigating from a link inside closes it.
  const menuOpen = menuOpenAt === pathname
  const openMenu = useCallback(() => setMenuOpenAt(pathname), [pathname])
  const closeMenu = useCallback(() => setMenuOpenAt(null), [])

  const compareCount = useSyncExternalStore(
    subscribeStorage,
    () => readCount(storageKeys.compare, 3),
    zero,
  )
  const inquiryCount = useSyncExternalStore(
    subscribeStorage,
    () => readCount(storageKeys.inquiry),
    zero,
  )

  const value = useMemo(
    () => ({ menuOpen, openMenu, closeMenu, compareCount, inquiryCount }),
    [menuOpen, openMenu, closeMenu, compareCount, inquiryCount],
  )
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShell(): Shell {
  const shell = useContext(ShellContext)
  if (!shell) throw new Error('useShell outside <ShellProvider>')
  return shell
}
