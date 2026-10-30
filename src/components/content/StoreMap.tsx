/**
 * Drawn map of a shop (board Kontakt: roads and a pin, no tiles): no embedded map and no request
 * to Google before consent (spec. §18). The link around it opens Google Maps.
 */
export function StoreMap({ id, label }: { id: string; label: string }) {
  const glow = `${id}-glow`
  return (
    <svg
      className="ct-map"
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="400" height="220" className="ct-map__ground" />
      <g className="ct-map__road" strokeWidth="10" fill="none" strokeLinecap="round">
        <path d="M-10 160 C80 140 140 170 220 120 S340 60 420 70" />
        <path d="M120 -10 C130 60 150 110 170 230" />
        <path d="M260 -10 L300 230" />
      </g>
      <g className="ct-map__street" strokeWidth="4" fill="none">
        <path d="M-10 60 L420 40" />
        <path d="M40 230 L90 -10" />
        <path d="M330 -10 C320 80 360 150 420 180" />
        <path d="M-10 200 L420 210" />
      </g>
      {/* Gold light around the pin, darker edges (board); one id per map on the page. */}
      <defs>
        <radialGradient id={glow} cx=".5" cy=".55" r=".6">
          <stop offset="0" stopColor="var(--ct-map-glow)" />
          <stop offset="1" stopColor="var(--ct-map-shade)" />
        </radialGradient>
      </defs>
      <rect width="400" height="220" fill={`url(#${glow})`} />
      <g transform="translate(200 104)">
        <circle r="34" className="ct-map__halo" />
        <path
          d="M0 18 C-4 8 -14 2 -14 -10 a14 14 0 0 1 28 0 C14 2 4 8 0 18Z"
          className="ct-map__pin"
        />
        <circle cy="-10" r="5" className="ct-map__dot" />
      </g>
      <text x="200" y="152" textAnchor="middle" className="ct-map__label">
        {label}
      </text>
    </svg>
  )
}
