'use client'

import { useEffect, useRef } from 'react'

import { DESKTOP, FINE_POINTER, matchesMedia, prefersReducedMotion } from '@/lib/motion'

/**
 * Mouse parallax for a server-rendered hero (runda v3 PREMIUM §2.3): sets `--mx` / `--my`
 * (-0.5…0.5, the cursor's place in the section) on its parent; CSS turns them into small moves of
 * the planes. Only on a desktop width with a mouse and with motion allowed. Renders nothing.
 */
export function MouseParallax() {
  const marker = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const host = marker.current?.parentElement
    if (!host) return
    let frame = 0

    const onMove = (event: MouseEvent) => {
      if (!matchesMedia(DESKTOP) || !matchesMedia(FINE_POINTER) || prefersReducedMotion()) return
      const { clientX, clientY } = event
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = host.getBoundingClientRect()
        host.style.setProperty('--mx', ((clientX - box.left) / box.width - 0.5).toFixed(3))
        host.style.setProperty('--my', ((clientY - box.top) / box.height - 0.5).toFixed(3))
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(frame)
      host.style.setProperty('--mx', '0')
      host.style.setProperty('--my', '0')
    }

    host.addEventListener('mousemove', onMove)
    host.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(frame)
      host.removeEventListener('mousemove', onMove)
      host.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return <span ref={marker} hidden />
}
