'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'

import { useShell } from '@/components/shell/ShellProvider'

// The dialog and its styles are a separate chunk, fetched on the first open only (NAWIGACJA §8:
// the search is outside the main JS bundle).
const SearchDialog = dynamic(() => import('./SearchDialog').then((mod) => mod.SearchDialog), {
  ssr: false,
})

/** Is the key press typed into a field (where „/” is just a character)? */
function inField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
}

/**
 * Opens the search with Ctrl K / ⌘K anywhere and „/” outside form fields (NAWIGACJA §5), and
 * renders the dialog while it is open.
 */
export function SearchHost() {
  const { searchOpen, openSearch, closeSearch } = useShell()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const k = event.key.toLowerCase()
      if (k === 'k' && (event.ctrlKey || event.metaKey) && !event.altKey) {
        event.preventDefault()
        openSearch()
      } else if (event.key === '/' && !event.ctrlKey && !event.metaKey && !inField(event.target)) {
        event.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openSearch])

  return searchOpen ? <SearchDialog onClose={closeSearch} /> : null
}
