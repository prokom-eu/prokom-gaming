'use client'

import { usePathname } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
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
  /** The search dialog (NAWIGACJA §5): open from the rail, the header, Ctrl K, „/”, the menu. */
  searchOpen: boolean
  openSearch: () => void
  closeSearch: () => void
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
  // The button that opened the menu (hamburger or tab bar), for the search opened from the menu.
  const menuOpener = useRef<HTMLElement | null>(null)
  const searchReturn = useRef<HTMLElement | null>(null)
  const openMenu = useCallback(() => {
    const el = document.activeElement
    // iOS Safari does not focus a tapped button: nothing to return to then.
    menuOpener.current = el instanceof HTMLElement && el !== document.body ? el : null
    setMenuOpenAt(pathname)
  }, [pathname])
  const closeMenu = useCallback(() => setMenuOpenAt(null), [])
  const [searchOpen, setSearchOpen] = useState(false)
  const openSearch = useCallback(() => {
    // From the menu: the dialog would return the focus to the menu's own button, which closes with
    // the menu (the focus would land on <body>) — return it to the menu's opener instead.
    searchReturn.current = menuOpen ? menuOpener.current : null
    setMenuOpenAt(null)
    setSearchOpen(true)
  }, [menuOpen])
  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    const target = searchReturn.current
    searchReturn.current = null
    if (!target) return
    requestAnimationFrame(() => {
      if (document.activeElement === document.body && target.isConnected) target.focus()
    })
  }, [])

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
    () => ({
      menuOpen,
      openMenu,
      closeMenu,
      compareCount,
      inquiryCount,
      searchOpen,
      openSearch,
      closeSearch,
    }),
    [
      menuOpen,
      openMenu,
      closeMenu,
      compareCount,
      inquiryCount,
      searchOpen,
      openSearch,
      closeSearch,
    ],
  )
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShell(): Shell {
  const shell = useContext(ShellContext)
  if (!shell) throw new Error('useShell outside <ShellProvider>')
  return shell
}
