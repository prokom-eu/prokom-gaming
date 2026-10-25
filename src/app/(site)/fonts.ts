import { Archivo, Cinzel, Cormorant_Garamond, Manrope } from 'next/font/google'

// ADR-G003 §2. next/font downloads the files at build time and serves them from our domain —
// the browser never calls Google. All four are variable fonts; `latin-ext` for Polish letters.
// Each sets a CSS variable read by `--font-*` in globals.css (tokens.css keeps the plain names).
// Preload only Manrope (body and UI text): preloading all four meant ~410 KB of fonts ahead of
// everything else and LCP 5.0 s on a throttled phone (Lighthouse, G2). The others load when
// used and swap in (`display: swap`, fallback metrics adjusted by next/font — no layout shift).

export const cinzel = Cinzel({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  preload: false,
  variable: '--font-cinzel',
})

export const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: false,
  variable: '--font-cormorant',
})

export const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-manrope',
})

// Only the PRO-KOM mark (width 118, weight 800) — needs the `wdth` axis.
export const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  display: 'swap',
  preload: false,
  variable: '--font-archivo',
})

export const fontVariables = [cinzel, cormorant, manrope, archivo].map((f) => f.variable).join(' ')
