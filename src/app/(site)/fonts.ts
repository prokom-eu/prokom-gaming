import localFont from 'next/font/local'

// ADR-G003 §2. All fonts are served from our domain — the browser never calls Google.
// Cinzel, Cormorant and Manrope are our own subsets of the Google variable fonts (OFL, licences
// next to the files), one file per family and style: Latin, Latin-1, Polish letters and the
// typography the site uses, weights cut to the ones in use. `next/font/google` can only give
// `latin` + `latin-ext` — two files per family for Polish text, 137–224 KB of fonts per page,
// the biggest item before LCP on a throttled phone (Lighthouse, G15). Made by
// `scripts/subset-site-fonts.py`; Archivo (logo only) by `scripts/subset-logo-font.py`.
// Each sets a CSS variable read by `--font-*` in globals.css (tokens.css keeps the plain names).
// Preload only Manrope (body and UI text) and the ~1 KB logo font: preloading every font meant
// ~410 KB ahead of everything else and LCP 5.0 s (Lighthouse, G2). The others load when used and
// swap in (`display: swap`, fallback metrics adjusted by next/font — no layout shift).

export const cinzel = localFont({
  // Names 700, one label 400.
  src: './fonts/cinzel.woff2',
  weight: '400 700',
  style: 'normal',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
  variable: '--font-cinzel',
})

export const cormorant = localFont({
  // Headings 600, lore and leads 500 (italic).
  src: [
    { path: './fonts/cormorant.woff2', weight: '500 600', style: 'normal' },
    { path: './fonts/cormorant-italic.woff2', weight: '500 600', style: 'italic' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
  variable: '--font-cormorant',
})

export const manrope = localFont({
  src: './fonts/manrope.woff2',
  weight: '400 800',
  style: 'normal',
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
