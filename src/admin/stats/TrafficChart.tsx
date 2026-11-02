import styles from './stats.module.css'
import { num } from './model'

const shortDay = (day: string) => `${Number(day.slice(8, 10))}.${Number(day.slice(5, 7))}`

/** A round top for the axis: 339 → 340, 7 → 8 (four even steps). */
function niceMax(value: number): number {
  if (value <= 4) return 4
  const step = Math.pow(10, Math.floor(Math.log10(value / 4)))
  const nice = [1, 2, 2.5, 5, 10].map((m) => m * step).find((s) => s * 4 >= value) ?? step * 10
  return nice * 4
}

type Series = {
  days: readonly string[]
  visitors: readonly number[] | null
  inquiries: readonly number[]
}

/** The computer drawing is wide and low; the phone one keeps the board's taller shape. */
const SHAPES = {
  wide: { w: 1000, h: 220, padL: 40, labelEvery: (n: number) => (n > 10 ? 4 : 1) },
  phone: { w: 360, h: 260, padL: 30, labelEvery: (n: number) => (n > 10 ? 7 : 2) },
} as const

/**
 * „Ruch i zapytania” (board Statystyki): visitors as a gold line with area, inquiries as blue
 * bars. Without Umami only the bars, on their own axis. Drawn on the server, once per shape (CSS
 * shows one); the same numbers are in a table for screen readers (the SVGs are decorative).
 */
export function TrafficChart({ days, visitors, inquiries }: Series) {
  return (
    <figure className={styles.chart}>
      <Drawing shape="wide" days={days} visitors={visitors} inquiries={inquiries} />
      <Drawing shape="phone" days={days} visitors={visitors} inquiries={inquiries} />
      <table className="pn-sr">
        <caption>Ruch i zapytania dzień po dniu</caption>
        <thead>
          <tr>
            <th scope="col">Dzień</th>
            {visitors ? <th scope="col">Odwiedzający</th> : null}
            <th scope="col">Zapytania</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d, i) => (
            <tr key={d}>
              <th scope="row">{shortDay(d)}</th>
              {visitors ? <td>{visitors[i]}</td> : null}
              <td>{inquiries[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function Drawing({ shape, days, visitors, inquiries }: Series & { shape: keyof typeof SHAPES }) {
  const { w: W, h: H, padL: PAD_L, labelEvery: every } = SHAPES[shape]
  const PAD_B = 26
  const PAD_T = 8
  const n = days.length
  const lead = visitors ?? inquiries
  const top = niceMax(Math.max(1, ...lead))
  const innerW = W - PAD_L - 8
  const innerH = H - PAD_B - PAD_T
  const slot = innerW / n
  const x = (i: number) => PAD_L + slot * i + slot / 2
  const y = (v: number, max = top) => PAD_T + innerH - (v / max) * innerH
  // With visitors the bars are a quarter of the height (board); alone they use the whole axis.
  const barMax = visitors ? Math.max(1, ...inquiries) * 4 : top
  const ticks = [0, 1, 2, 3, 4].map((k) => (top / 4) * k)
  const labelEvery = every(n)
  const line = visitors?.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' L')
  const base = (PAD_T + innerH).toFixed(1)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={shape === 'wide' ? styles.wideSvg : styles.phoneSvg}
      aria-hidden="true"
      focusable="false"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD_L} x2={W - 8} y1={y(t)} y2={y(t)} className={styles.grid} />
          <text x={PAD_L - 8} y={y(t) + 4} textAnchor="end" className={styles.axis}>
            {num(t)}
          </text>
        </g>
      ))}
      {inquiries.map((v, i) => (
        <rect
          key={days[i]}
          x={x(i) - Math.min(14, slot * 0.28)}
          width={Math.min(28, slot * 0.56)}
          y={y(v, barMax)}
          height={Math.max(0, PAD_T + innerH - y(v, barMax))}
          rx={2}
          className={styles.bar}
        />
      ))}
      {line ? (
        <>
          <path
            d={`M${x(0).toFixed(1)},${base} L${line} L${x(n - 1).toFixed(1)},${base} Z`}
            className={styles.area}
          />
          <path d={`M${line}`} className={styles.line} />
        </>
      ) : null}
      {days.map((d, i) =>
        i % labelEvery === 0 ? (
          <text key={d} x={x(i)} y={H - 6} textAnchor="middle" className={styles.axis}>
            {shortDay(d)}
          </text>
        ) : null,
      )}
    </svg>
  )
}
