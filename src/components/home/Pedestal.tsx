/**
 * The stand under the computer in the hero: one shared shape for every creature (a slab with a
 * ring of runes), coloured by the creature (`--c`). The board draws seven kinds (stone, water,
 * tomb, stump, mirror, ice, basalt) — they come later as exported images (decision 27.10.2026).
 */
export function Pedestal() {
  return (
    <svg className="hero__pedestal" viewBox="0 0 600 150" aria-hidden="true" focusable="false">
      <path className="hero__pedestal-side" d="M24 52v44a276 42 0 0 0 552 0V52" />
      <ellipse className="hero__pedestal-top" cx="300" cy="52" rx="276" ry="42" />
      <ellipse className="hero__pedestal-rune" cx="300" cy="52" rx="238" ry="30" pathLength="680" />
      <ellipse className="hero__pedestal-glow" cx="300" cy="52" rx="200" ry="22" />
    </svg>
  )
}
