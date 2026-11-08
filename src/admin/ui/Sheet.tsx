'use client'

import type { ReactNode } from 'react'

import { BottomSheet } from '../../components/BottomSheet'

/**
 * Sheet from the bottom in the panel look (spec §2 `Sheet`, §2a): the site's `BottomSheet` — a
 * native <dialog> with focus kept inside, Esc, backdrop tap and drag down; focus returns to the
 * button that opened it.
 */
export function Sheet({
  open,
  onClose,
  label,
  closeLabel = 'Zamknij',
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  closeLabel?: string
  children: ReactNode
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label={label}
      closeLabel={closeLabel}
      className="pn-sheet"
    >
      {children}
    </BottomSheet>
  )
}
