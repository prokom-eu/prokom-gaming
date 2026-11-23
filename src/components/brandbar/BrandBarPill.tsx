'use client'

import { useEffect, useRef } from 'react'

/**
 * The pill under the pointed or keyboard-focused line of the brand bar (MOTYW-PASEK-LINII §4
 * pkt 1). Moved by `transform` and `width` only; positions measured with getBoundingClientRect
 * against the list (each line sits in its own positioned item, so offsetLeft would be wrong).
 * When the pointer leaves it goes back under the focused line, else the current one. Esc hides
 * the tooltip until the next pointing or focus (WCAG 1.4.13).
 */
export function BrandBarPill() {
  const pill = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const element = pill.current
    const nav = element?.parentElement
    if (!element || !nav) return
    const lineOf = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLElement>('.bbar__line') : null
    const show = (line: HTMLElement | null) => {
      if (!line) {
        element.removeAttribute('data-on')
        return
      }
      const box = line.getBoundingClientRect()
      const left = box.left - nav.getBoundingClientRect().left
      element.style.transform = `translateX(${left}px)`
      element.style.width = `${box.width}px`
      element.setAttribute('data-on', '')
    }
    // Back under the keyboard-focused line (not one left focused by a mouse click), else the
    // current one.
    const focused = () => {
      const active = document.activeElement
      return active && nav.contains(active) && active.matches(':focus-visible')
        ? lineOf(active)
        : null
    }
    const home = () =>
      show(focused() ?? nav.querySelector<HTMLElement>('.bbar__line[aria-current="page"]'))
    // The line under the pointer or focus: Esc's dismissal lasts until another line is reached
    // (pointerover also fires moving between the dash and the text of the same link).
    let shown: HTMLElement | null = null
    const onOver = (event: Event) => {
      const line = lineOf(event.target)
      if (!line || line === shown) return
      shown = line
      nav.removeAttribute('data-tip-off')
      show(line)
    }
    const onOut = (event: FocusEvent | PointerEvent) => {
      if (nav.contains(event.relatedTarget as Node | null)) return
      shown = null
      home()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') nav.setAttribute('data-tip-off', '')
    }
    // The first placement must not slide in from the left edge: placed with transitions off,
    // flushed, then switched back on.
    element.setAttribute('data-instant', '')
    home()
    element.getBoundingClientRect()
    element.removeAttribute('data-instant')
    // Fonts swapping in, zoom or a resized window change the lines' boxes.
    // The pointed line's dash grows on hover, which resizes the list too: keep the pill under it.
    const observer = new ResizeObserver(() => (shown ? show(shown) : home()))
    observer.observe(nav)
    nav.addEventListener('pointerover', onOver)
    nav.addEventListener('focusin', onOver)
    nav.addEventListener('pointerleave', onOut)
    nav.addEventListener('focusout', onOut)
    document.addEventListener('keydown', onKey)
    return () => {
      observer.disconnect()
      nav.removeEventListener('pointerover', onOver)
      nav.removeEventListener('focusin', onOver)
      nav.removeEventListener('pointerleave', onOut)
      nav.removeEventListener('focusout', onOut)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return <span ref={pill} className="bbar__pill" aria-hidden="true" />
}
