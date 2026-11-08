// Creature scenes drawn in code (R4, runda v2 §3.2): for every creature a hero panorama
// (2880×1067), a card scene (1680×960, pedestal at x 1124) and a transparent foreground
// (drawn 2880×2000, saved 2160×1500), as WebP in public/scenes/. Same id = same picture (seeded).
//
//   pnpm generate:scenes                        all 16
//   pnpm generate:scenes skrzat zmij            only these
//   OUT=tmp/scenes node scripts/scenes/generate.mjs   somewhere else
//
// The card pedestal with the creature's sigil is cut once from the previous card scenes into
// scripts/scenes/pedestals/ and pasted back, so the computer stands exactly where CSS expects
// it (builds.css: centre 67%, top face at 26.5% from the bottom).
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

import { SCENES } from './scenes.mjs'
import { fog, glow, id, mix, rng, stars, vgrad } from './lib.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const OUT = path.resolve(root, process.env.OUT ?? 'public/scenes')
const PEDESTALS = path.join(here, 'pedestals')
const SCENE_BG = '#030505' // tokens.css --scene-bg: the page around the scene

/** Colours of every creature (seed/prokomgaming/creatures.json, the same as tokens.css). */
const creatures = JSON.parse(
  readFileSync(path.join(root, 'seed/prokomgaming/creatures.json'), 'utf8'),
).items.map((c) => ({ id: c.id, color: c.color.toLowerCase() }))

/**
 * Where things go. `cx` is the middle the computer stands on, `hz` the horizon, `s` the scale of
 * every size and offset. Hero: the page shows the lower ~63% and the middle ~2/3 (phone: only
 * ±320 px around cx). Card: the pedestal at x 1124; the card shows ±560 px around it.
 */
const LAYOUTS = {
  hero: { kind: 'hero', W: 2880, H: 1067, cx: 1440, hz: 880, s: 1 },
  card: { kind: 'card', W: 1680, H: 960, cx: 1124, hz: 640, s: 0.72 },
}

/** Where the pedestal PNG goes on the card scene (and the box it was cut from). */
const PEDESTAL_BOX = { left: 858, top: 682, width: 532, height: 124 }

/**
 * The pedestal with the creature's sigil, cut from the pre-R4 card scenes and kept in
 * scripts/scenes/pedestals/ — the only copy now that public/scenes/ holds the new scenes. If one
 * is lost, cut it again from the old scene in git (never from a new one, it would degrade):
 *   git show e2122c4:public/scenes/<id>-card.webp > tmp/old/<id>-card.webp
 *   PEDESTAL_SOURCE=tmp/old pnpm generate:scenes <id>
 */
async function pedestalFor(key) {
  const file = path.join(PEDESTALS, `${key}.png`)
  if (existsSync(file)) return file
  if (!process.env.PEDESTAL_SOURCE) {
    throw new Error(`Missing ${path.relative(root, file)} — see pedestalFor() in generate.mjs.`)
  }
  const src = path.resolve(root, process.env.PEDESTAL_SOURCE, `${key}-card.webp`)
  mkdirSync(PEDESTALS, { recursive: true })
  const b = PEDESTAL_BOX
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${b.width}" height="${b.height}">
      <filter id="e"><feGaussianBlur stdDeviation="0.7"/></filter>
      <polygon filter="url(#e)" fill="#fff" points="${906 - b.left},${686 - b.top} ${1342 - b.left},${686 - b.top} ${1386 - b.left},${802 - b.top} ${862 - b.left},${802 - b.top}"/>
    </svg>`,
  )
  await sharp(src)
    .extract(b)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toFile(file)
  return file
}

/** Drawing context handed to a scene: layers by depth, sizes scaled to the layout. */
function context(L, key, accent) {
  const r = rng(`${key}-${L.kind}`)
  const layers = {
    sky: [],
    far: [],
    farFog: [],
    back: [],
    mid: [],
    fog: [],
    ground: [],
    near: [],
    fx: [],
  }
  const defs = []
  const ctx = {
    L,
    r,
    c: accent,
    hz: L.hz,
    W: L.W,
    H: L.H,
    X: (off) => L.cx + off * L.s,
    /**
     * Offset that differs per layout: the build page shows the hero from x ~390 to ~2600 with
     * text over x 630–1075 and 1890–2270, so lit details go to the edges (|off| 820–1150); the
     * card shows only ±560 px around the pedestal.
     */
    P: (hero, card) => L.cx + (L.kind === 'hero' ? hero : card),
    S: (v) => v * L.s,
    add: (layer, svg) => layers[layer].push(svg),
    def: (svg) => defs.push(svg),
    /** Add a [defs, shape] pair from lib.mjs. */
    put: (layer, [d, shape]) => {
      defs.push(d)
      layers[layer].push(shape)
    },
    /** Night colours tinted by the creature's colour. */
    tone: {
      sky0: '#020506',
      sky1: mix('#06100f', accent, 0.07),
      sky2: mix('#0b1614', accent, 0.3),
      far: mix(mix('#0b1614', accent, 0.22), '#000000', 0.35),
      mid: mix('#050b0b', accent, 0.06),
      near: '#020404',
      ground: mix('#071010', accent, 0.08),
    },
  }
  return { ctx, layers, defs }
}

/** The parts every scene shares: sky, stars, light behind the middle, ground, fade, vignette. */
function frame(ctx, opts) {
  const { r, c, hz, W, H, X, S, tone } = ctx
  const skyStops = opts.sky ?? [
    [0, tone.sky0],
    [0.55, tone.sky1],
    [1, tone.sky2],
  ]
  ctx.put('sky', vgrad(0, 0, W, hz + 4, skyStops))
  if (opts.stars !== false)
    ctx.add('sky', stars(r, W, hz * 0.85, Math.round((W * hz) / 9000), '#f3f0e6'))
  // Light behind the middle: the computer stands in it (SCENY-BRIEF §2).
  ctx.put(
    'sky',
    glow(X(0), hz - S(130), S(1000), S(420), opts.light ?? c, opts.lightOpacity ?? 0.42),
  )
  // Ground: from the horizon down to the page background.
  ctx.put(
    'ground',
    vgrad(0, hz - 2, W, H - hz + 2, [
      [0, opts.groundTop ?? tone.ground],
      [0.6, mix(tone.ground, SCENE_BG, 0.6)],
      [1, SCENE_BG],
    ]),
  )
  ctx.put('ground', glow(X(0), hz + S(60), S(520), S(70), c, 0.22))
  // Mist on the horizon.
  ctx.put(
    'fog',
    fog(0, hz - S(70), W, S(120), mix(tone.sky2, '#9aa7a3', 0.25), opts.mist ?? 0.35, S(45)),
  )
}

/** Shade the edges and fade the bottom into the page. */
function finish(ctx) {
  const { W, H, L } = ctx
  ctx.put(
    'fx',
    vgrad(0, H * 0.84, W, H * 0.16 + 1, [
      [0, SCENE_BG, 0],
      [1, SCENE_BG, 1],
    ]),
  )
  const v = id('vg')
  ctx.def(
    `<radialGradient id="${v}" cx="${L.cx / W}" cy="0.62" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>`,
  )
  ctx.add('fx', `<rect width="${W}" height="${H}" fill="url(#${v})"/>`)
}

function svgOf(L, layers, defs) {
  // Back to front; the ground goes right after the far fog, under everything that stands on it.
  const seq = ['sky', 'far', 'farFog', 'ground', 'back', 'mid', 'fog', 'near', 'fx']
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L.W}" height="${L.H}" viewBox="0 0 ${L.W} ${L.H}"><defs>${defs.join('')}</defs>${seq.map((k) => layers[k].join('')).join('')}</svg>`
}

/** Fine grain against banding in the dark gradients (and a little texture). */
async function grain(W, H, seed, amount) {
  const r = rng(seed)
  const buf = Buffer.alloc(W * H * 4)
  for (let i = 0; i < W * H; i++) {
    const n = 128 + Math.round((r() - 0.5) * 2 * amount)
    buf[i * 4] = n
    buf[i * 4 + 1] = n
    buf[i * 4 + 2] = n
    buf[i * 4 + 3] = 255
  }
  return sharp(buf, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toBuffer()
}

async function render(key, accent, kind) {
  const L = LAYOUTS[kind]
  const scene = SCENES[key]
  const { ctx, layers, defs } = context(L, key, accent)
  frame(ctx, scene.frame ?? {})
  scene.draw(ctx)
  finish(ctx)
  const svg = svgOf(L, layers, defs)
  const extras = [{ input: await grain(L.W, L.H, key + kind, 10), blend: 'soft-light' }]
  if (kind === 'card')
    extras.push({ input: await pedestalFor(key), left: PEDESTAL_BOX.left, top: PEDESTAL_BOX.top })
  await sharp(Buffer.from(svg))
    .composite(extras)
    .webp({ quality: 82, effort: 6 })
    .toFile(path.join(OUT, `${key}-${kind}.webp`))
}

/** Foreground: dark silhouettes in the bottom corners and at the top edges, middle empty. */
async function renderFg(key, accent) {
  const W = 2880
  const H = 2000
  const scene = SCENES[key]
  const r = rng(`${key}-fg`)
  const parts = { defs: [], body: [] }
  scene.fg({
    r,
    c: accent,
    W,
    H,
    put: ([d, s]) => (parts.defs.push(d), parts.body.push(s)),
    add: (s) => parts.body.push(s),
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${parts.defs.join('')}</defs>${parts.body.join('')}</svg>`
  // Saved at 3/4 size: the page asks for ~1800 px at 1440 and this layer is never the LCP. At
  // 1920 or DPR 2 it is scaled up a little — fine for dark, soft silhouettes in front.
  await sharp(Buffer.from(svg))
    .resize(2160)
    .webp({ quality: 60, alphaQuality: 60, effort: 6 })
    .toFile(path.join(OUT, `${key}-fg.webp`))
}

const only = process.argv.slice(2)
for (const key of only) {
  if (!creatures.some((c) => c.id === key)) console.warn(`unknown creature id: ${key}`)
}
mkdirSync(OUT, { recursive: true })
for (const { id: key, color } of creatures) {
  if (only.length && !only.includes(key)) continue
  if (!SCENES[key]) {
    console.warn(`skip ${key}: no scene yet`)
    continue
  }
  await render(key, color, 'hero')
  await render(key, color, 'card')
  await renderFg(key, color)
  console.log(`scene ${key}: hero, card, fg`)
}
