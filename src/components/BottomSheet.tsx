'use client'

import { useEffect, useRef, type MouseEvent, type PointerEvent, type ReactNode } from 'react'

import { IconClose } from './icons'

type Props = {
  open: boolean
  onClose: () => void
  /** Accessible name of the dialog, e.g. "Menu". */
  label: string
  /** Name of the close button, e.g. "Zamknij menu". */
  closeLabel: string
  /** Left side of the header row (logo, title). */
  headerStart?: ReactNode
  /** From 761 px show as a panel from the right instead of a sheet (menu on a tablet). */
  side?: boolean
  id?: string
  children: ReactNode
}

// Drag further than this (px) or a quarter of the sheet height and it closes.
const CLOSE_DISTANCE = 90
// Movement below this is a tap, not a drag.
const DRAG_START = 6

/**
 * Bottom sheet on a native `<dialog>` with `showModal()` (ADR-G003 §4), no library:
 * the browser makes the page behind inert (focus stays in the sheet), closes on Esc and
 * returns focus to the button that opened it. Here: closing on the backdrop, the close button
 * and dragging the top bar down; the slide is CSS (`@starting-style`), off with reduced motion.
 */
export function BottomSheet({
  open,
  onClose,
  label,
  closeLabel,
  headerStart,
  side = false,
  id,
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const drag = useRef<{ startY: number; dy: number; active: boolean } | null>(null)
  // Set after a real drag, so the click that follows pointerup does not hit a link or button.
  const suppressClick = useRef(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal() focuses the first link while the sheet is still below the screen (start of
      // the slide-in), and the browser scrolls the sheet's content to that focus — the grab bar
      // and the top of the header end up hidden above the edge. Start every opening at the top;
      // the focused element is in the header, so it stays in view. Again on the next frame:
      // on a slow phone the focus scroll can land after this line.
      dialog.scrollTop = 0
      requestAnimationFrame(() => {
        dialog.scrollTop = 0
      })
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  // The click lands on the <dialog> itself only on its ::backdrop (or padding outside content).
  function onClick(event: MouseEvent<HTMLDialogElement>) {
    const dialog = ref.current
    if (!dialog || event.target !== dialog) return
    const r = dialog.getBoundingClientRect()
    const inside =
      event.clientX >= r.left &&
      event.clientX <= r.right &&
      event.clientY >= r.top &&
      event.clientY <= r.bottom
    if (!inside) onClose()
  }

  function setDrag(dy: number) {
    const dialog = ref.current
    if (!dialog) return
    dialog.style.setProperty('--drag', `${dy}px`)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (side && window.matchMedia('(min-width: 761px)').matches) return
    if (event.button !== 0) return
    drag.current = { startY: event.clientY, dy: 0, active: false }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state) return
    const dy = Math.max(0, event.clientY - state.startY)
    if (!state.active && dy > DRAG_START) {
      state.active = true
      event.currentTarget.setPointerCapture(event.pointerId)
      ref.current?.setAttribute('data-dragging', 'true')
    }
    if (state.active) {
      state.dy = dy
      setDrag(dy)
    }
  }

  function onPointerEnd() {
    const state = drag.current
    drag.current = null
    const dialog = ref.current
    if (!state?.active || !dialog) return
    dialog.removeAttribute('data-dragging')
    suppressClick.current = true
    // No click follows a drag released outside the bar: forget the flag on the next frame.
    requestAnimationFrame(() => {
      suppressClick.current = false
    })
    const far = state.dy > Math.min(CLOSE_DISTANCE, dialog.offsetHeight / 4)
    if (far) onClose()
    else setDrag(0)
  }

  function onClickCapture(event: MouseEvent) {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <dialog
      ref={ref}
      id={id}
      aria-label={label}
      className={side ? 'sheet sheet--side' : 'sheet'}
      onClick={onClick}
      // Esc (cancel) and dialog.close() both end here: keep the parent state in sync.
      onClose={() => {
        setDrag(0)
        onClose()
      }}
    >
      <div
        className="sheet__drag"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
      >
        <span className="sheet__grab" aria-hidden="true" />
        <div className="sheet__head">
          {headerStart}
          <button type="button" className="sheet__close" aria-label={closeLabel} onClick={onClose}>
            <IconClose />
          </button>
        </div>
      </div>
      {children}
    </dialog>
  )
}
