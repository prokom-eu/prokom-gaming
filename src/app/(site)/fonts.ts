import { Cinzel, Cormorant_Garamond, Manrope } from 'next/font/google'
import localFont from 'next/font/local'

// ADR-G003 §2. next/font downloads the files at build time and serves them from our domain —
// the browser never calls Google. Cinzel, Cormorant and Manrope are variable fonts with
// `latin-ext` for Polish letters; Archivo (logo only) is a local subset. Each sets a CSS variable
// read by `--font-*` in globals.css (tokens.css keeps the plain names).
// Preload only Manrope (body and UI text) and the ~1 KB logo font: preloading all four Google
// fonts meant ~410 KB ahead of everything else and LCP 5.0 s on a throttled phone (Lighthouse,
// G2). The others load when used and swap in (`display: swap`, fallback metrics adjusted by
// next/font — no layout shift).

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

// Only the PRO–KOM mark (width 118, weight 800). Not the full variable Archivo from Google
// (~88 KB on every page, Lighthouse G7): a static subset with just the logo letters, ~1 KB, made by
// `scripts/subset-logo-font.py` (licence: `fonts/Archivo-OFL.txt`). Small enough to preload.
export const archivo = localFont({
  src: './fonts/archivo-logo.woff2',
  weight: '800',
  style: 'normal',
  declarations: [{ prop: 'font-stretch', value: '118%' }],
  display: 'swap',
  variable: '--font-archivo',
})

export const fontVariables = [cinzel, cormorant, manrope, archivo].map((f) => f.variable).join(' ')
