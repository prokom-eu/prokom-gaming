// Drawing helpers for the creature scenes (R4): small SVG builders, a seeded random generator and
// colour mixing. Everything returns SVG markup strings; generate.mjs puts the layers together.

/** Seeded random numbers (mulberry32): the same id always draws the same scene. */
export function rng(seed) {
  let a = 0
  for (const ch of String(seed)) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) + 1) | 0
  const next = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  next.range = (lo, hi) => lo + (hi - lo) * next()
  next.int = (lo, hi) => Math.floor(next.range(lo, hi + 1))
  next.pick = (list) => list[Math.floor(next() * list.length)]
  return next
}

const hex = (c) => {
  const h = c.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}
const toHex = (rgb) =>
  '#' +
  rgb
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')

/** `a` blended towards `b` by `t` (0 = a, 1 = b). */
export function mix(a, b, t) {
  const [x, y] = [hex(a), hex(b)]
  return toHex(x.map((v, i) => v + (y[i] - v) * t))
}

export const f = (n) => Math.round(n * 10) / 10

let uid = 0
/** Unique id for gradients and filters inside one SVG. */
export const id = (p) => `${p}${++uid}`

/** Path through points, closed down to `bottom` (a silhouette standing on the ground). */
export function silhouette(points, bottom, fill, extra = '') {
  const d =
    `M${f(points[0][0])},${f(bottom)} ` +
    points.map(([x, y]) => `L${f(x)},${f(y)}`).join(' ') +
    ` L${f(points[points.length - 1][0])},${f(bottom)} Z`
  return `<path d="${d}" fill="${fill}" ${extra}/>`
}

/** Mountain or hill line: sum of waves plus noise, from x0 to x1 around baseline y. */
export function ridge(r, { x0, x1, y, amp, step = 10, waves = 3, peaks = [] }) {
  const ph = Array.from({ length: waves }, () => [r.range(0, 6.28), r.range(0.6, 1.6)])
  const pts = []
  for (let x = x0; x <= x1 + step; x += step) {
    let h = 0
    ph.forEach(([p, k], i) => (h += Math.sin(x / (380 / k / (i + 1)) + p) / (i + 1)))
    h += r.range(-0.12, 0.12)
    for (const pk of peaks) h += pk.h * Math.exp(-(((x - pk.x) / pk.w) ** 2))
    pts.push([x, y - amp * (0.5 + h / 2)])
  }
  return pts
}

/** A spruce: jagged tiers from the top down. */
export function pine(x, y, h, w, fill, r, snow = null) {
  const tiers = 6
  // Right edge from the top down (tip of each tier out, notch in), then mirrored for the left.
  const right = []
  for (let i = 1; i <= tiers; i++) {
    const t = i / tiers
    const ty = y - h + h * 0.95 * t
    const tw = (w / 2) * (0.12 + 0.88 * t)
    const j = r ? r.range(0.85, 1.12) : 1
    right.push([x + tw * j, ty], [x + tw * 0.42, ty - h * 0.025])
  }
  right[right.length - 1] = [x + w * 0.05, y - h * 0.04]
  const left = right.map(([a, b]) => [2 * x - a + (r ? r.range(-2, 2) : 0), b]).reverse()
  const pts = [[x, y - h], ...right, [x + w * 0.05, y], [x - w * 0.05, y], ...left]
  const d = `M${pts.map(([a, b]) => `${f(a)},${f(b)}`).join(' L')} Z`
  let out = `<path d="${d}" fill="${fill}"/>`
  if (snow) {
    // Caps of snow on the tiers.
    for (let i = 1; i <= tiers; i++) {
      const t = i / tiers
      const ty = y - h + h * 0.92 * t + h * 0.045
      const tw = (w / 2) * (0.15 + 0.85 * t)
      out += `<path d="M${f(x - tw * 0.95)},${f(ty)} Q${f(x)},${f(ty - h * 0.07)} ${f(x + tw * 0.95)},${f(ty)} Q${f(x)},${f(ty - h * 0.03)} ${f(x - tw * 0.95)},${f(ty)}Z" fill="${snow}"/>`
    }
  }
  return out
}

/** A band of spruces from x0 to x1; trees inside `gap` are skipped or kept low. */
export function forest(
  r,
  { x0, x1, y, hMin, hMax, fill, spacing = 0.42, gap = null, gapH = 0, snow = null },
) {
  let out = ''
  let x = x0
  while (x < x1) {
    const inGap = gap && x > gap[0] && x < gap[1]
    const h = inGap ? r.range(hMin, hMin + gapH) : r.range(hMin, hMax)
    if (!inGap || gapH > 0)
      out += pine(x, y + r.range(-3, 3), h, h * r.range(0.32, 0.42), fill, r, snow)
    x += h * spacing * r.range(0.6, 1.2)
  }
  return out
}

/** A leafless tree: recursive branches as strokes. */
export function bareTree(
  r,
  x,
  y,
  h,
  color,
  { width = h / 22, spread = 0.55, depth = 6, lean = 0 } = {},
) {
  let out = ''
  const branch = (x1, y1, len, ang, w, d) => {
    const x2 = x1 + Math.sin(ang) * len
    const y2 = y1 - Math.cos(ang) * len
    const mx = (x1 + x2) / 2 + r.range(-len, len) * 0.12
    const my = (y1 + y2) / 2 + r.range(-len, len) * 0.12
    out += `<path d="M${f(x1)},${f(y1)} Q${f(mx)},${f(my)} ${f(x2)},${f(y2)}" stroke="${color}" stroke-width="${f(Math.max(w, 0.8))}" stroke-linecap="round" fill="none"/>`
    if (d <= 0) return
    const n = d > depth - 2 ? 2 : r.int(2, 3)
    for (let i = 0; i < n; i++) {
      const a = ang + r.range(-spread, spread) + (i - (n - 1) / 2) * spread * 0.6
      branch(x2, y2, len * r.range(0.62, 0.8), a, w * 0.66, d - 1)
    }
  }
  branch(x, y, h * 0.36, lean, width, depth)
  return out
}

/** A leafy crown: overlapping circles on a trunk. */
export function leafyTree(r, x, y, h, fill, { crown = 0.62, width = 0.7, trunk = null } = {}) {
  const cw = h * width
  const cy = y - h + (h * crown) / 2
  let out = `<path d="M${f(x - h * 0.03)},${f(y)} L${f(x - h * 0.018)},${f(cy)} L${f(x + h * 0.018)},${f(cy)} L${f(x + h * 0.035)},${f(y)} Z" fill="${trunk ?? fill}"/>`
  for (let i = 0; i < 26; i++) {
    const a = r.range(0, Math.PI * 2)
    const d = Math.sqrt(r()) * 0.5
    const cx = x + Math.cos(a) * d * cw
    const ccy = cy + Math.sin(a) * d * h * crown * 0.75
    out += `<circle cx="${f(cx)}" cy="${f(ccy)}" r="${f(r.range(0.1, 0.2) * cw)}" fill="${fill}"/>`
  }
  return out
}

/** Birch: pale trunk with dark marks and thin hanging branches. */
export function birch(r, x, y, h, bark, mark, leaf) {
  const w = h * 0.025
  let out = `<path d="M${f(x - w)},${f(y)} Q${f(x - w * 0.6)},${f(y - h / 2)} ${f(x - w * 0.3)},${f(y - h)} L${f(x + w * 0.3)},${f(y - h)} Q${f(x + w * 0.6)},${f(y - h / 2)} ${f(x + w)},${f(y)} Z" fill="${bark}"/>`
  for (let i = 0; i < 12; i++) {
    const my = y - r.range(0.05, 0.95) * h
    out += `<rect x="${f(x - w * 0.9)}" y="${f(my)}" width="${f(w * r.range(0.6, 1.4))}" height="${f(h * 0.008)}" fill="${mark}"/>`
  }
  for (let i = 0; i < 14; i++) {
    const sy = y - h * r.range(0.45, 1)
    const dir = r() < 0.5 ? -1 : 1
    const len = h * r.range(0.12, 0.3)
    out += `<path d="M${f(x)},${f(sy)} q${f(dir * len * 0.5)},${f(-len * 0.15)} ${f(dir * len)},${f(len * 0.5)}" stroke="${leaf}" stroke-width="${f(h * 0.004)}" fill="none" opacity="0.8"/>`
    out += `<ellipse cx="${f(x + dir * len * 0.8)}" cy="${f(sy + len * 0.25)}" rx="${f(len * 0.35)}" ry="${f(len * 0.5)}" fill="${leaf}" opacity="0.55"/>`
  }
  return out
}

/** Stars: small dots, fewer near the horizon. */
export function stars(r, W, yMax, n, color = '#ffffff') {
  let out = ''
  for (let i = 0; i < n; i++) {
    const y = yMax * Math.pow(r(), 1.6)
    const big = r() < 0.06
    out += `<circle cx="${f(r.range(0, W))}" cy="${f(y)}" r="${f(big ? r.range(1.4, 2.4) : r.range(0.5, 1.3))}" fill="${color}" opacity="${f(r.range(0.25, big ? 1 : 0.8))}"/>`
  }
  return out
}

/** Glowing dots (fireflies, embers, sparks): a soft halo plus a bright core. */
export function glowDots(r, { x0, x1, y0, y1, n, color, size = 3, core = '#fff8e0' }) {
  let out = ''
  for (let i = 0; i < n; i++) {
    const x = r.range(x0, x1)
    const y = r.range(y0, y1)
    const s = size * r.range(0.6, 1.4)
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s * 4)}" fill="${color}" opacity="0.14"/>`
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="${core}" opacity="${f(r.range(0.55, 0.95))}"/>`
  }
  return out
}

/** Radial glow as a gradient-filled ellipse. Returns [defs, shape]. */
export function glow(cx, cy, rx, ry, color, opacity) {
  const g = id('g')
  return [
    `<radialGradient id="${g}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="0.45" stop-color="${color}" stop-opacity="${f(opacity * 0.35)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`,
    `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${g})"/>`,
  ]
}

/** Fog: a soft band (blurred rectangle). Returns [defs, shape]. */
export function fog(x, y, w, h, color, opacity, blur = 40) {
  const fl = id('b')
  return [
    `<filter id="${fl}" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="${blur}"/></filter>`,
    `<ellipse cx="${f(x + w / 2)}" cy="${f(y + h / 2)}" rx="${f(w / 2)}" ry="${f(h / 2)}" fill="${color}" opacity="${opacity}" filter="url(#${fl})"/>`,
  ]
}

/** Blur filter by radius. Returns [defs, filterId]. */
export function blur(radius) {
  const fl = id('b')
  return [
    `<filter id="${fl}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${radius}"/></filter>`,
    fl,
  ]
}

/** Moon with halo and faint maria. Returns [defs, shapes]. */
export function moon(cx, cy, rad, color, accent, haloOpacity = 0.5) {
  const [d1, halo] = glow(cx, cy, rad * 5, rad * 5, accent, haloOpacity)
  const g = id('m')
  const defs =
    d1 +
    `<radialGradient id="${g}" cx="0.4" cy="0.38" r="0.7"><stop offset="0" stop-color="${mix(color, '#ffffff', 0.35)}"/><stop offset="1" stop-color="${mix(color, accent, 0.25)}"/></radialGradient>`
  const shade = mix(color, '#000000', 0.18)
  const body =
    halo +
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad)}" fill="url(#${g})"/>` +
    `<circle cx="${f(cx - rad * 0.3)}" cy="${f(cy - rad * 0.15)}" r="${f(rad * 0.22)}" fill="${shade}" opacity="0.35"/>` +
    `<circle cx="${f(cx + rad * 0.25)}" cy="${f(cy + rad * 0.3)}" r="${f(rad * 0.14)}" fill="${shade}" opacity="0.3"/>` +
    `<circle cx="${f(cx + rad * 0.35)}" cy="${f(cy - rad * 0.35)}" r="${f(rad * 0.1)}" fill="${shade}" opacity="0.28"/>`
  return [defs, body]
}

/** Grass blades in a strip (meadow, field, river bank). */
export function grass(r, { x0, x1, y, hMin, hMax, color, n, bend = 0, width = 3 }) {
  let out = ''
  for (let i = 0; i < n; i++) {
    const x = r.range(x0, x1)
    const h = r.range(hMin, hMax)
    const b = bend * h + r.range(-0.25, 0.25) * h
    const w = width * r.range(0.6, 1.4)
    out += `<path d="M${f(x - w)},${f(y)} Q${f(x + b * 0.3)},${f(y - h * 0.6)} ${f(x + b)},${f(y - h)} Q${f(x + b * 0.3 + w * 0.3)},${f(y - h * 0.55)} ${f(x + w)},${f(y)} Z" fill="${color}"/>`
  }
  return out
}

/** Vertical gradient rectangle. Returns [defs, rect]. */
export function vgrad(x, y, w, h, stops) {
  const g = id('v')
  return [
    `<linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`,
    `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="url(#${g})"/>`,
  ]
}
