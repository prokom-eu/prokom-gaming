// Scene-level shapes built from lib.mjs (R4): land, water, buildings and weather that several
// creature scenes share, plus the foreground pieces. `ctx` is the drawing context from
// generate.mjs; `p` the foreground one (2880×2000, transparent).
import { bareTree, f, fog, forest, glow, grass, mix, ridge, silhouette, vgrad } from './lib.mjs'

/* ---------- land ---------- */

/** Rolling far hills (or mountains with `peaks`) across the whole width. */
export function farHills(
  ctx,
  { amp = 90, lift = 0, color, peaks = [], layer = 'far', waves = 3 } = {},
) {
  const { r, W, hz, S, tone } = ctx
  const pts = ridge(r, { x0: -20, x1: W + 20, y: hz - S(lift), amp: S(amp), peaks, waves })
  ctx.add(layer, silhouette(pts, hz + 10, color ?? tone.far))
}

/** Peaks for `farHills` placed by offset from the middle (scaled to the layout). */
export const peaksAt = (ctx, list) => list.map(([off, h, w]) => ({ x: ctx.X(off), h, w: ctx.S(w) }))

/** Spruce forest on both sides, low (or missing) in the middle. */
export function sideForest(
  ctx,
  { y, hMin = 90, hMax = 200, fill, gap = 300, gapH = 0, layer = 'back', snow = null, spacing },
) {
  const { r, W, X, S } = ctx
  ctx.add(
    layer,
    forest(r, {
      x0: -40,
      x1: W + 40,
      y,
      hMin: S(hMin),
      hMax: S(hMax),
      fill,
      gap: [X(-gap), X(gap)],
      gapH: S(gapH),
      snow,
      spacing,
    }),
  )
}

/** A strip of grass along the horizon (near layer). */
export function horizonGrass(ctx, color, { n = 650, hMax = 24, dy = 30 } = {}) {
  const { r, W, hz, S } = ctx
  ctx.add(
    'near',
    grass(r, { x0: 0, x1: W, y: hz + S(dy), hMin: S(6), hMax: S(hMax), color, n, width: S(2) }),
  )
}

/** A lone hill silhouette. */
export function hill(ctx, x, y, w, h, fill, layer = 'back') {
  const { r } = ctx
  const pts = []
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    pts.push([x - w / 2 + w * t, y - h * Math.sin(Math.PI * t) ** 0.8 + r.range(-2, 2)])
  }
  ctx.add(layer, silhouette(pts, y + 6, fill))
}

/** Jagged rocks (a group of boulders). */
export function rocks(ctx, x, y, w, h, fill, layer = 'mid', rim = null) {
  const { r } = ctx
  let out = ''
  let cx = x - w / 2
  while (cx < x + w / 2) {
    const bw = w * r.range(0.12, 0.28)
    const bh = h * r.range(0.4, 1)
    const pts = [
      [cx, y],
      [cx + bw * 0.1, y - bh * 0.6],
      [cx + bw * r.range(0.3, 0.5), y - bh],
      [cx + bw * r.range(0.6, 0.8), y - bh * r.range(0.7, 0.95)],
      [cx + bw, y - bh * 0.3],
      [cx + bw * 1.05, y],
    ]
    out += silhouette(pts, y + 4, fill)
    if (rim)
      out += `<path d="M${f(pts[1][0])},${f(pts[1][1])} L${f(pts[2][0])},${f(pts[2][1])} L${f(pts[3][0])},${f(pts[3][1])}" stroke="${rim}" stroke-width="2" fill="none" opacity="0.5"/>`
    cx += bw * r.range(0.6, 0.9)
  }
  ctx.add(layer, out)
}

/* ---------- water ---------- */

/** Still water from y0 to y1 with the light behind the middle mirrored in it. */
export function water(ctx, y0, y1, { tint, glowX, glowOpacity = 0.55 }) {
  const { r, W, S } = ctx
  ctx.put(
    'ground',
    vgrad(0, y0, W, y1 - y0, [
      [0, mix('#0c1a1c', tint, 0.22)],
      [0.5, mix('#06100f', tint, 0.08)],
      [1, '#030707'],
    ]),
  )
  ctx.put('ground', glow(glowX, y0 + S(4), S(620), S(28), tint, glowOpacity))
  ctx.put(
    'ground',
    fog(glowX - S(30), y0, S(60), (y1 - y0) * 0.9, mix(tint, '#ffffff', 0.35), 0.3, S(7)),
  )
  let ripples = ''
  for (let i = 0; i < 70; i++) {
    const y = r.range(y0 + S(4), y1 - S(6))
    const spread = S(140) + (y - y0) * 1.6
    const x = glowX + r.range(-spread, spread)
    const len = r.range(S(14), S(70))
    ripples += `<path d="M${f(x - len / 2)},${f(y)} L${f(x + len / 2)},${f(y)}" stroke="${mix(tint, '#ffffff', 0.4)}" stroke-width="${f(S(1.6))}" opacity="${f(r.range(0.12, 0.42))}"/>`
  }
  ctx.add('ground', ripples)
  // The near bank: a dark soft edge under the water.
  const bank = []
  for (let x = -20; x <= W + 20; x += 30) bank.push([x, y1 + r.range(-S(5), S(5))])
  ctx.add('ground', silhouette(bank, ctx.H + 2, mix(ctx.tone.ground, '#000', 0.25)))
}

/** Reeds and cattails standing at x0..x1 on the line y. */
export function reeds(ctx, x0, x1, y, h, color, layer = 'mid') {
  const { r, S } = ctx
  let out = ''
  for (let x = x0; x < x1; x += S(r.range(6, 16))) {
    const hh = h * r.range(0.5, 1)
    const b = r.range(-0.15, 0.15) * hh
    out += `<path d="M${f(x)},${f(y)} Q${f(x + b * 0.3)},${f(y - hh * 0.6)} ${f(x + b)},${f(y - hh)}" stroke="${color}" stroke-width="${f(S(2.6))}" fill="none"/>`
    if (r() < 0.22)
      out += `<ellipse cx="${f(x + b * 0.8)}" cy="${f(y - hh * 0.82)}" rx="${f(S(4))}" ry="${f(S(13))}" fill="${color}"/>`
  }
  ctx.add(layer, out)
}

/** Water lilies: flat pads with a few pale flowers. */
export function lilies(ctx, x0, x1, y0, y1, pad, flower) {
  const { r, S } = ctx
  let out = ''
  for (let i = 0; i < 26; i++) {
    const x = r.range(x0, x1)
    const y = r.range(y0, y1)
    const s = S(r.range(14, 30)) * (0.6 + (y - y0) / (y1 - y0))
    out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s)}" ry="${f(s * 0.32)}" fill="${pad}"/>`
    if (r() < 0.3)
      out += `<ellipse cx="${f(x + s * 0.2)}" cy="${f(y - s * 0.18)}" rx="${f(s * 0.3)}" ry="${f(s * 0.18)}" fill="${flower}" opacity="0.85"/>`
  }
  ctx.add('ground', out)
}

/* ---------- buildings ---------- */

export function cottage(ctx, x, y, size, { lit, wall, roof }) {
  const { S } = ctx
  const w = S(size)
  const h = w * 0.55
  const rh = w * 0.42
  let out = ''
  out += `<rect x="${f(x - w / 2)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}" fill="${wall}"/>`
  out += `<path d="M${f(x - w * 0.62)},${f(y - h + 6)} L${f(x - w * 0.08)},${f(y - h - rh)} L${f(x + w * 0.08)},${f(y - h - rh)} L${f(x + w * 0.62)},${f(y - h + 6)} Z" fill="${roof}"/>`
  out += `<rect x="${f(x + w * 0.22)}" y="${f(y - h - rh * 0.85)}" width="${f(w * 0.08)}" height="${f(rh * 0.6)}" fill="${roof}"/>`
  for (const wx of [-0.24, 0.18]) {
    const ww = w * 0.13
    const cx = x + wx * w
    const cy = y - h * 0.58
    out += `<rect x="${f(cx - ww / 2)}" y="${f(cy - ww * 0.55)}" width="${f(ww)}" height="${f(ww * 1.1)}" fill="${lit}"/>`
    out += `<rect x="${f(cx - 1.5)}" y="${f(cy - ww * 0.55)}" width="3" height="${f(ww * 1.1)}" fill="${wall}"/>`
    out += `<rect x="${f(cx - ww / 2)}" y="${f(cy - 1.5)}" width="${f(ww)}" height="3" fill="${wall}"/>`
  }
  out += `<rect x="${f(x - w * 0.02)}" y="${f(y - h * 0.62)}" width="${f(w * 0.12)}" height="${f(h * 0.62)}" fill="${mix(wall, '#000', 0.4)}"/>`
  return out
}

export function haystack(x, y, w, fill, rim) {
  const h = w * 0.8
  return (
    `<path d="M${f(x - w / 2)},${f(y)} Q${f(x - w * 0.5)},${f(y - h * 0.9)} ${f(x)},${f(y - h)} Q${f(x + w * 0.5)},${f(y - h * 0.9)} ${f(x + w / 2)},${f(y)} Z" fill="${fill}"/>` +
    `<path d="M${f(x - w * 0.32)},${f(y - h * 0.82)} Q${f(x)},${f(y - h * 1.02)} ${f(x + w * 0.32)},${f(y - h * 0.82)}" stroke="${rim}" stroke-width="3" fill="none" opacity="0.7"/>`
  )
}

export function fence(x0, x1, y, h, color, r) {
  let out = ''
  const step = h * 0.9
  for (let x = x0; x <= x1; x += step * r.range(0.85, 1.15)) {
    out += `<rect x="${f(x)}" y="${f(y - h * r.range(0.9, 1.1))}" width="${f(h * 0.08)}" height="${f(h)}" fill="${color}"/>`
  }
  out += `<path d="M${f(x0)},${f(y - h * 0.7)} L${f(x1)},${f(y - h * 0.66)}" stroke="${color}" stroke-width="${f(h * 0.06)}"/>`
  out += `<path d="M${f(x0)},${f(y - h * 0.35)} L${f(x1)},${f(y - h * 0.32)}" stroke="${color}" stroke-width="${f(h * 0.06)}"/>`
  return out
}

/** Smoke from a chimney: soft blurred puffs going up and sideways. */
export function smoke(ctx, x, y, color) {
  const { S } = ctx
  for (let i = 0; i < 6; i++) {
    ctx.put(
      'mid',
      fog(
        x + S(i * 26) - S(20),
        y - S(40 + i * 46),
        S(70 + i * 24),
        S(44 + i * 10),
        color,
        f(0.22 - i * 0.03),
        S(14),
      ),
    )
  }
}

/** A cliff with a castle on top (Wampir). */
export function castleOnCliff(ctx, x, y, size, { rock, wall, lit }) {
  const { r, S } = ctx
  const w = S(size)
  const top = y - w * 0.55
  const pts = [
    [x - w * 0.75, y],
    [x - w * 0.55, y - w * 0.2],
    [x - w * 0.42, top + w * 0.04],
    [x - w * 0.3, top],
    [x + w * 0.32, top + 2],
    [x + w * 0.4, top + w * 0.12],
    [x + w * 0.5, y - w * 0.18],
    [x + w * 0.85, y],
  ]
  let out = silhouette(
    pts.map(([a, b]) => [a + r.range(-3, 3), b]),
    y + 4,
    rock,
  )
  const towers = [
    [-0.26, 0.42, 0.1],
    [-0.1, 0.62, 0.12],
    [0.08, 0.5, 0.11],
    [0.24, 0.36, 0.09],
  ]
  out += `<rect x="${f(x - w * 0.3)}" y="${f(top - w * 0.22)}" width="${f(w * 0.6)}" height="${f(w * 0.24)}" fill="${wall}"/>`
  for (const [dx, th, tw] of towers) {
    const tx = x + dx * w
    const tH = th * w
    out += `<rect x="${f(tx - (tw * w) / 2)}" y="${f(top - tH)}" width="${f(tw * w)}" height="${f(tH)}" fill="${wall}"/>`
    out += `<path d="M${f(tx - (tw * w) / 2 - 3)},${f(top - tH)} L${f(tx)},${f(top - tH - tw * w * 1.3)} L${f(tx + (tw * w) / 2 + 3)},${f(top - tH)} Z" fill="${wall}"/>`
    for (let k = 0; k < 2; k++) {
      if (r() < 0.35) continue
      out += `<rect x="${f(tx - 2.5)}" y="${f(top - tH + tH * (0.25 + k * 0.3))}" width="5" height="${f(w * 0.022)}" fill="${lit}"/>`
    }
  }
  for (let k = 0; k < 9; k++) {
    out += `<rect x="${f(x - w * 0.3 + k * w * 0.068)}" y="${f(top - w * 0.25)}" width="${f(w * 0.035)}" height="${f(w * 0.035)}" fill="${wall}"/>`
  }
  return out
}

/** Ruins on a hill: broken arches and columns (Strzyga). */
export function ruins(ctx, x, y, size, { stone, hillFill }) {
  const { r, S } = ctx
  const w = S(size)
  hill(ctx, x, y, w * 1.9, w * 0.32, hillFill, 'back')
  const base = y - w * 0.28
  let out = ''
  // One long ruined wall with a jagged, broken top and arched openings cut through it (even-odd),
  // a tall broken tower at the left end: reads as a ruin, not as a row of separate letters.
  const x0 = x - w * 0.7
  const x1 = x + w * 0.62
  const topPts = []
  for (let k = 0; k <= 16; k++) {
    const t = k / 16
    const px = x0 + (x1 - x0) * t
    const h = w * (0.5 - 0.3 * t) * r.range(0.65, 1.05)
    topPts.push(
      [px, base - h],
      [px + ((x1 - x0) / 16) * r.range(0.3, 0.7), base - h * r.range(0.75, 1)],
    )
  }
  let d =
    `M${f(x0)},${f(base)} ` +
    topPts.map(([a, b]) => `L${f(a)},${f(b)}`).join(' ') +
    ` L${f(x1)},${f(base)} Z`
  const arches = 4
  for (let k = 0; k < arches; k++) {
    const ax = x0 + (x1 - x0) * ((k + 0.6) / (arches + 0.4))
    const ow = w * 0.13
    const oh = w * (0.3 - 0.05 * k)
    d += ` M${f(ax - ow / 2)},${f(base)} L${f(ax - ow / 2)},${f(base - oh)} A${f(ow / 2)},${f(ow / 2)} 0 0 1 ${f(ax + ow / 2)},${f(base - oh)} L${f(ax + ow / 2)},${f(base)} Z`
  }
  out += `<path fill-rule="evenodd" fill="${stone}" d="${d}"/>`
  const tx = x0 - w * 0.06
  out += `<path fill="${stone}" d="M${f(tx - w * 0.09)},${f(base)} L${f(tx - w * 0.09)},${f(base - w * 0.86)} L${f(tx - w * 0.02)},${f(base - w * 0.8)} L${f(tx + w * 0.03)},${f(base - w * 0.9)} L${f(tx + w * 0.1)},${f(base - w * 0.7)} L${f(tx + w * 0.1)},${f(base)} Z"/>`
  out += `<rect x="${f(tx - w * 0.015)}" y="${f(base - w * 0.6)}" width="${f(w * 0.03)}" height="${f(w * 0.08)}" fill="#000" opacity="0.6"/>`
  // Fallen blocks.
  for (let i = 0; i < 6; i++) {
    const bx = x + r.range(-0.9, 0.9) * w
    const bw = w * r.range(0.04, 0.09)
    out += `<rect x="${f(bx)}" y="${f(base - bw * 0.6)}" width="${f(bw)}" height="${f(bw * 0.6)}" fill="${stone}" transform="rotate(${f(r.range(-15, 15))} ${f(bx)} ${f(base)})"/>`
  }
  ctx.add('back', out)
  return { base }
}

/** Owl silhouettes perched on a line (no faces: just the shape with ear tufts). */
export function owls(x, y, s, fill, n = 2, gap = 2.6) {
  let out = ''
  for (let i = 0; i < n; i++) {
    const ox = x + i * s * gap
    out += `<path d="M${f(ox - s * 0.5)},${f(y)} Q${f(ox - s * 0.62)},${f(y - s * 0.9)} ${f(ox - s * 0.42)},${f(y - s * 1.35)} L${f(ox - s * 0.3)},${f(y - s * 1.62)} L${f(ox - s * 0.12)},${f(y - s * 1.38)} Q${f(ox)},${f(y - s * 1.45)} ${f(ox + s * 0.12)},${f(y - s * 1.38)} L${f(ox + s * 0.3)},${f(y - s * 1.62)} L${f(ox + s * 0.42)},${f(y - s * 1.35)} Q${f(ox + s * 0.62)},${f(y - s * 0.9)} ${f(ox + s * 0.5)},${f(y)} Z" fill="${fill}"/>`
  }
  return out
}

/** A crooked hut far away on a hill with one faint window (Baba Jaga). */
export function hutOnHill(ctx, x, y, size, { hillFill, wall, lit }) {
  const { S } = ctx
  const w = S(size)
  hill(ctx, x, y, w * 4.2, w * 0.9, hillFill, 'back')
  const by = y - w * 0.86
  const h = w * 0.5
  let out = `<path d="M${f(x - w / 2)},${f(by)} L${f(x - w * 0.46)},${f(by - h)} L${f(x + w * 0.5)},${f(by - h * 1.06)} L${f(x + w / 2)},${f(by)} Z" fill="${wall}"/>`
  out += `<path d="M${f(x - w * 0.66)},${f(by - h + 4)} L${f(x - w * 0.02)},${f(by - h - w * 0.55)} L${f(x + w * 0.7)},${f(by - h * 1.06 + 6)} Z" fill="${wall}"/>`
  out += `<rect x="${f(x + w * 0.06)}" y="${f(by - h * 0.7)}" width="${f(w * 0.16)}" height="${f(w * 0.16)}" fill="${lit}"/>`
  // Stilt legs under the hut (wooden posts).
  for (const lx of [-0.32, 0.3])
    out += `<path d="M${f(x + lx * w)},${f(by)} l${f(lx * w * 0.2)},${f(w * 0.16)}" stroke="${wall}" stroke-width="${f(w * 0.05)}"/>`
  ctx.put('back', glow(x + w * 0.14, by - h * 0.62, w * 0.9, w * 0.6, lit, 0.35))
  ctx.add('back', out)
}

/** Big leafy oak with a gnarled trunk (Perun). */
export function oak(ctx, x, y, h, fill, rim) {
  const { r } = ctx
  const tw = h * 0.09
  let out = `<path d="M${f(x - tw * 1.6)},${f(y)} Q${f(x - tw * 0.7)},${f(y - h * 0.2)} ${f(x - tw * 0.6)},${f(y - h * 0.45)} L${f(x + tw * 0.6)},${f(y - h * 0.45)} Q${f(x + tw * 0.8)},${f(y - h * 0.2)} ${f(x + tw * 1.8)},${f(y)} Z" fill="${fill}"/>`
  // Main limbs.
  for (const [a, l] of [
    [-1.0, 0.36],
    [-0.45, 0.4],
    [0.2, 0.38],
    [0.8, 0.36],
    [1.25, 0.3],
  ]) {
    out += `<path d="M${f(x)},${f(y - h * 0.42)} q${f(Math.sin(a) * h * l * 0.4)},${f(-h * l * 0.5)} ${f(Math.sin(a) * h * l)},${f(-Math.cos(a) * h * l * 0.7)}" stroke="${fill}" stroke-width="${f(tw * 0.55)}" fill="none" stroke-linecap="round"/>`
  }
  // Crown: many lumps, wide and low.
  for (let i = 0; i < 70; i++) {
    const a = r.range(Math.PI, Math.PI * 2)
    const d = Math.sqrt(r())
    const cx = x + Math.cos(a) * d * h * 0.62
    const cy = y - h * 0.62 + Math.sin(a) * d * h * 0.36 + r.range(0, h * 0.12)
    const rad = h * r.range(0.06, 0.12)
    out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad)}" fill="${fill}"/>`
    if (rim && cy < y - h * 0.8 && r() < 0.5)
      out += `<path d="M${f(cx - rad * 0.7)},${f(cy - rad * 0.7)} A${f(rad)},${f(rad)} 0 0 1 ${f(cx + rad * 0.7)},${f(cy - rad * 0.7)}" stroke="${rim}" stroke-width="2" fill="none" opacity="0.45"/>`
  }
  return out
}

/* ---------- weather and sky ---------- */

/** A lightning bolt with branches and a glow (Perun). */
export function lightning(ctx, x, y0, y1, color) {
  const { r, S } = ctx
  const bolt = (sx, sy, ey, wid, depth) => {
    let d = `M${f(sx)},${f(sy)}`
    let cx = sx
    let cy = sy
    const segs = 9
    const pts = []
    for (let i = 1; i <= segs; i++) {
      cy = sy + ((ey - sy) * i) / segs
      cx += r.range(-S(38), S(38))
      d += ` L${f(cx)},${f(cy)}`
      pts.push([cx, cy])
    }
    let out = `<path d="${d}" stroke="${color}" stroke-width="${f(wid * 3.5)}" fill="none" opacity="0.25"/><path d="${d}" stroke="#ffffff" stroke-width="${f(wid)}" fill="none" stroke-linejoin="round"/>`
    if (depth > 0) {
      for (let k = 0; k < 2; k++) {
        const [bx, by] = pts[r.int(2, 5)]
        out += bolt(bx, by, by + (ey - by) * r.range(0.3, 0.5), wid * 0.5, depth - 1)
      }
    }
    return out
  }
  ctx.put('sky', glow(x, (y0 + y1) / 2, S(420), (y1 - y0) * 0.7, color, 0.35))
  ctx.add('sky', bolt(x, y0, y1, S(3.4), 2))
}

/** Heavy storm clouds: dark blurred lumps with a lit underside. */
export function stormClouds(ctx, y, color, light) {
  const { r, W, S } = ctx
  for (let i = 0; i < 16; i++) {
    const x = r.range(-200, W)
    const w = S(r.range(380, 820))
    ctx.put(
      'sky',
      fog(
        x,
        y + r.range(-S(90), S(60)),
        w,
        S(r.range(90, 170)),
        color,
        f(r.range(0.55, 0.85)),
        S(26),
      ),
    )
  }
  for (let i = 0; i < 6; i++) {
    ctx.put('sky', fog(r.range(0, W), y + S(70), S(r.range(300, 600)), S(30), light, 0.12, S(18)))
  }
}

/** Aurora: soft wavy bands in the sky (Pani Zimy). */
export function aurora(ctx, y, colors) {
  const { r, W, S } = ctx
  colors.forEach((col, k) => {
    let d = ''
    const amp = S(r.range(40, 80))
    const base = y + k * S(50)
    for (let x = -100; x <= W + 100; x += 60) {
      const yy = base + Math.sin(x / S(320) + k) * amp + Math.sin(x / S(140)) * amp * 0.25
      d += (x === -100 ? 'M' : ' L') + `${f(x)},${f(yy)}`
    }
    const [fd, fid] = [
      `<filter id="au${k}${col.slice(1)}" x="-10%" y="-200%" width="120%" height="500%"><feGaussianBlur stdDeviation="${f(S(22))}"/></filter>`,
      `au${k}${col.slice(1)}`,
    ]
    ctx.def(fd)
    ctx.add(
      'sky',
      `<path d="${d}" stroke="${col}" stroke-width="${f(S(70 - k * 14))}" fill="none" opacity="${f(0.38 - k * 0.08)}" filter="url(#${fid})"/>`,
    )
    // Vertical curtains hanging from the band.
    for (let i = 0; i < 36; i++) {
      const x = r.range(0, W)
      const yy = base + Math.sin(x / S(320) + k) * amp
      ctx.add(
        'sky',
        `<rect x="${f(x)}" y="${f(yy - S(120))}" width="${f(S(r.range(3, 9)))}" height="${f(S(r.range(90, 180)))}" fill="${col}" opacity="${f(r.range(0.04, 0.12))}" filter="url(#${fid})"/>`,
      )
    }
  })
}

/** Falling snow: small pale dots. */
export function snow(ctx, n, layer = 'fx') {
  const { r, W, H, S } = ctx
  let out = ''
  for (let i = 0; i < n; i++) {
    out += `<circle cx="${f(r.range(0, W))}" cy="${f(r.range(0, H * 0.92))}" r="${f(S(r.range(0.8, 2.6)))}" fill="#eef6ff" opacity="${f(r.range(0.25, 0.8))}"/>`
  }
  ctx.add(layer, out)
}

/** Moths: tiny pale wings flying around a light. */
export function moths(ctx, cx, cy, rad, n, color) {
  const { r, S } = ctx
  let out = ''
  for (let i = 0; i < n; i++) {
    const a = r.range(0, Math.PI * 2)
    const d = rad * Math.sqrt(r.range(0.15, 1))
    const x = cx + Math.cos(a) * d * 1.6
    const y = cy + Math.sin(a) * d
    const s = S(r.range(3, 7))
    out += `<path d="M${f(x)},${f(y)} l${f(-s)},${f(-s * 0.7)} l${f(s * 0.3)},${f(s * 0.9)} Z M${f(x)},${f(y)} l${f(s)},${f(-s * 0.7)} l${f(-s * 0.3)},${f(s * 0.9)} Z" fill="${color}" opacity="${f(r.range(0.45, 0.9))}"/>`
  }
  ctx.add('fx', out)
}

/** Leaves caught in a whirlwind: small ellipses along a widening spiral (Bies). */
export function whirl(ctx, cx, baseY, h, color) {
  const { r, S } = ctx
  let out = ''
  for (let i = 0; i < 90; i++) {
    const t = r()
    const a = t * Math.PI * 9 + r.range(-0.3, 0.3)
    const rad = S(20) + t * h * 0.42
    const x = cx + Math.cos(a) * rad
    const y = baseY - t * h + Math.sin(a) * rad * 0.18
    const s = S(r.range(4, 9))
    out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s)}" ry="${f(s * 0.45)}" fill="${color}" opacity="${f(r.range(0.4, 0.9))}" transform="rotate(${f(r.range(0, 180))} ${f(x)} ${f(y)})"/>`
  }
  // The funnel of dust.
  ctx.put(
    'mid',
    fog(cx - h * 0.25, baseY - h * 0.95, h * 0.5, h, mix(color, '#9a9a80', 0.5), 0.12, S(20)),
  )
  ctx.add('fx', out)
}

/** Glowing cracks in rock: thin accent lines with a halo (Żmij). */
export function cracks(ctx, x0, x1, y0, y1, color, n) {
  const { r, S } = ctx
  let core = ''
  for (let i = 0; i < n; i++) {
    let x = r.range(x0, x1)
    let y = r.range(y0, y1)
    let d = `M${f(x)},${f(y)}`
    for (let k = 0; k < 5; k++) {
      x += r.range(-S(30), S(30))
      y += r.range(S(6), S(22))
      d += ` L${f(x)},${f(y)}`
    }
    core += `<path d="${d}" stroke="${color}" stroke-width="${f(S(7))}" opacity="0.3" fill="none"/><path d="${d}" stroke="${mix(color, '#fff2c0', 0.5)}" stroke-width="${f(S(1.8))}" fill="none"/>`
  }
  ctx.add('near', core)
}

/** Basalt columns: a block of hexagonal pillars (Żmij). */
export function basalt(ctx, x, y, w, h, fill, rim) {
  const { r } = ctx
  let out = ''
  const n = 15
  const cw = w / n
  for (let i = 0; i < n; i++) {
    const ch = h * (0.35 + 0.65 * Math.sin((Math.PI * (i + 0.5)) / n)) * r.range(0.55, 1.1)
    const cx = x - w / 2 + i * cw
    out += `<path d="M${f(cx)},${f(y)} L${f(cx)},${f(y - ch)} L${f(cx + cw * 0.5)},${f(y - ch - cw * 0.18)} L${f(cx + cw)},${f(y - ch)} L${f(cx + cw)},${f(y)} Z" fill="${fill}"/>`
    out += `<path d="M${f(cx)},${f(y - ch)} L${f(cx + cw * 0.5)},${f(y - ch - cw * 0.18)} L${f(cx + cw)},${f(y - ch)}" stroke="${rim}" stroke-width="2" fill="none" opacity="0.6"/>`
    out += `<path d="M${f(cx + cw)},${f(y - ch)} L${f(cx + cw)},${f(y)}" stroke="#000" stroke-width="2" opacity="0.5"/>`
  }
  return out
}

/** Floating wreaths of flowers on water (Rusałka). */
export function wreaths(ctx, list, leaf, flower) {
  const { S } = ctx
  let out = ''
  for (const [x, y, s0] of list) {
    const s = S(s0)
    out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s)}" ry="${f(s * 0.35)}" fill="none" stroke="${leaf}" stroke-width="${f(s * 0.25)}"/>`
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2
      out += `<circle cx="${f(x + Math.cos(a) * s)}" cy="${f(y + Math.sin(a) * s * 0.35 - s * 0.06)}" r="${f(s * 0.16)}" fill="${flower}"/>`
    }
    out += `<ellipse cx="${f(x)}" cy="${f(y + s * 0.2)}" rx="${f(s * 1.6)}" ry="${f(s * 0.18)}" fill="${flower}" opacity="0.12"/>`
  }
  ctx.add('ground', out)
}

/* ---------- foreground pieces (2880×2000, transparent) ---------- */

export function fern(x, y, len, ang, color) {
  let out = `<path d="M${f(x)},${f(y)} q${f(Math.sin(ang) * len * 0.5)},${f(-len * 0.6)} ${f(Math.sin(ang) * len)},${f(-Math.cos(ang) * len)}" stroke="${color}" stroke-width="7" fill="none" stroke-linecap="round"/>`
  for (let i = 1; i < 16; i++) {
    const t = i / 16
    const px = x + Math.sin(ang) * len * t + Math.sin(ang) * len * 0.15 * Math.sin(t * 3)
    const py = y - Math.cos(ang) * len * t
    const l = len * 0.22 * (1 - t * 0.7)
    out += `<path d="M${f(px)},${f(py)} l${f(-l)},${f(l * 0.25)} M${f(px)},${f(py)} l${f(l)},${f(l * 0.15)}" stroke="${color}" stroke-width="${f(10 * (1 - t * 0.6))}" stroke-linecap="round"/>`
  }
  return out
}

/** Bushes, grass and ferns in both bottom corners. */
export function cornerPlants(p, { color, ferns = true, tall = 1, bend = 0.2, n = 70 }) {
  const { r, W, H } = p
  let out = ''
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -40 : W - 760
    const x1 = side < 0 ? 760 : W + 40
    out += grass(r, {
      x0,
      x1,
      y: H + 10,
      hMin: 80 * tall,
      hMax: 300 * tall,
      color,
      n,
      bend: side * bend,
      width: 9,
    })
    if (ferns) {
      for (let i = 0; i < 4; i++) {
        const fx = side < 0 ? r.range(40, 520) : W - r.range(40, 520)
        out += fern(fx, H + 20, r.range(320, 520) * tall, side * r.range(0.25, 0.75), color)
      }
    }
  }
  return out
}

/** Leafless branches reaching in from the top corners. */
export function topBranches(p, { color, leaves = null, depth = 5 }) {
  const { r, W } = p
  let out = ''
  for (const side of [-1, 1]) {
    const x = side < 0 ? -60 : W + 60
    out += bareTree(r, x, -40, 1500, color, { width: 46, spread: 0.5, depth, lean: side * -2.0 })
    if (leaves) {
      for (let i = 0; i < 18; i++) {
        const lx = side < 0 ? r.range(0, 700) : W - r.range(0, 700)
        out += `<ellipse cx="${f(lx)}" cy="${f(r.range(0, 380))}" rx="${f(r.range(14, 30))}" ry="${f(r.range(8, 16))}" fill="${leaves}" transform="rotate(${f(r.range(-40, 40))} ${f(lx)} 0)"/>`
      }
    }
  }
  return out
}

/** Boulders in both bottom corners. */
export function cornerRocks(p, { color, rim = null, h = 420 }) {
  const { r, W, H } = p
  let out = ''
  for (const side of [-1, 1]) {
    let x = side < 0 ? -80 : W - 640
    const end = side < 0 ? 640 : W + 80
    while (x < end) {
      const bw = r.range(160, 320)
      const bh = h * r.range(0.4, 1)
      const pts = [
        [x, H + 4],
        [x + bw * 0.08, H - bh * 0.7],
        [x + bw * 0.4, H - bh],
        [x + bw * 0.75, H - bh * 0.85],
        [x + bw, H - bh * 0.25],
        [x + bw, H + 4],
      ]
      out += `<path d="M${pts.map(([a, b]) => `${f(a)},${f(b)}`).join(' L')} Z" fill="${color}"/>`
      if (rim)
        out += `<path d="M${f(pts[1][0])},${f(pts[1][1])} L${f(pts[2][0])},${f(pts[2][1])} L${f(pts[3][0])},${f(pts[3][1])}" stroke="${rim}" stroke-width="4" fill="none" opacity="0.4"/>`
      x += bw * r.range(0.55, 0.85)
    }
  }
  return out
}

/** Reeds in both bottom corners (water scenes). */
export function cornerReeds(p, { color }) {
  const { r, W, H } = p
  let out = ''
  for (const side of [-1, 1]) {
    for (let i = 0; i < 46; i++) {
      const x = side < 0 ? r.range(-20, 640) : W - r.range(-20, 640)
      const h = r.range(380, 900)
      const b = side * r.range(0, 0.25) * h
      out += `<path d="M${f(x)},${f(H + 10)} Q${f(x + b * 0.3)},${f(H - h * 0.6)} ${f(x + b)},${f(H - h)}" stroke="${color}" stroke-width="${f(r.range(6, 12))}" fill="none"/>`
      if (r() < 0.25)
        out += `<ellipse cx="${f(x + b * 0.85)}" cy="${f(H - h * 0.85)}" rx="12" ry="40" fill="${color}"/>`
    }
  }
  return out
}

/** Snow-laden branches from the top corners and drifts at the bottom (Pani Zimy). */
export function snowyCorners(p, { color, snowColor }) {
  const { r, W, H } = p
  let out = topBranches(p, { color })
  for (let i = 0; i < 60; i++) {
    const side = i % 2 ? 1 : -1
    const x = side < 0 ? r.range(0, 800) : W - r.range(0, 800)
    const y = r.range(0, 520)
    out += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r.range(16, 46))}" ry="${f(r.range(6, 12))}" fill="${snowColor}" opacity="0.6"/>`
  }
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -100 : W - 760
    out += `<path d="M${f(x0)},${f(H + 4)} Q${f(x0 + 200)},${f(H - 260)} ${f(x0 + 520)},${f(H - 120)} Q${f(x0 + 700)},${f(H - 60)} ${f(x0 + 860)},${f(H + 4)} Z" fill="${mix(snowColor, '#000', 0.65)}"/>`
  }
  return out
}
