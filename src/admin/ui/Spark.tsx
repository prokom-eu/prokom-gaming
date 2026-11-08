/**
 * Small line with filled area (KPI tiles, 30 days). Decorative: the tile's value and note say
 * the same in text. Scaled to its own min–max; a flat series draws in the middle.
 */
export function Spark({ values }: { values: readonly number[] }) {
  const w = 100
  const h = 36
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = w / (values.length - 1)
  const points = values.map((v, i) => {
    const y = max === min ? h / 2 : h - 3 - ((v - min) / range) * (h - 6)
    return `${(i * step).toFixed(2)},${y.toFixed(2)}`
  })
  const line = `M${points.join(' L')}`
  return (
    <svg
      className="pn-spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="currentColor" opacity={0.14} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
