'use client'

import Image, { type ImageProps } from 'next/image'
import { useLayoutEffect, useRef } from 'react'

/**
 * An image that emerges once it has loaded instead of popping in (runda v3 PREMIUM §2.3
 * „Ładowanie”): a fade with a slight sharpening. Never for the LCP image (hero scene or photo).
 *
 * Safe by default: the server HTML shows the image as is (no JavaScript — nothing hidden). Only
 * an image still loading when the browser mounts it waits hidden (`data-fade="wait"`); one
 * already in the cache stays as it is, so nothing flashes on hydration.
 */
export function FadeImage({ onLoad, alt, ...props }: ImageProps) {
  const ref = useRef<HTMLImageElement>(null)

  useLayoutEffect(() => {
    const img = ref.current
    if (img && !img.complete) img.dataset.fade = 'wait'
  }, [])

  return (
    <Image
      ref={ref}
      alt={alt}
      {...props}
      onLoad={(event) => {
        if (event.currentTarget.dataset.fade) event.currentTarget.dataset.fade = 'in'
        onLoad?.(event)
      }}
    />
  )
}
