'use client'

import { useSyncExternalStore } from 'react'

import { REDUCED_MOTION } from './motion'

/**
 * A media query as React state: re-renders when it changes. The server (and the first client
 * render, so hydration matches) gets `serverValue`.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  )
}

/** `prefers-reduced-motion: reduce` as React state. */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION)
}
