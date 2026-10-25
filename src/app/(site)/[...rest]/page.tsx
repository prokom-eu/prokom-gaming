import { notFound } from 'next/navigation'

// The app has two root layouts ((site) and (payload)), so an unknown address has no single
// layout to render a 404 in. This catch-all sends every unmatched site address to
// (site)/not-found.tsx, inside the normal shell. Static segments (/admin, /api) still win.
// `global-not-found` would do it too, but it is experimental and skips the layout.
export default function CatchAll() {
  notFound()
}
