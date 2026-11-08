'use client'

import { useCallback, useSyncExternalStore } from 'react'

import { REDUCED_MOTION } from './motion'

/**
 * A media query as React state: re-renders when it changes. The server (and the first client
 * render, so hydration matches) gets `serverValue`.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  // Stable per query: a new function would re-subscribe on every render.
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  )
}

/** `prefers-reduced-motion: reduce` as React state. */
export function useReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION)
}
