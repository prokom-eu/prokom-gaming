// The 16 places (SCENY-BRIEF.md §4): `draw` for the hero and card scenes, `fg` for the
// foreground. Places only — no creatures, faces or text. Lit details go where text does not
// (ctx.P: hero offset at the edges, card offset within ±560 of the pedestal); the middle stays low
// and empty for the pedestal and the computer.
import { bareTree, birch, f, fog, glow, glowDots, grass, leafyTree, mix, moon } from './lib.mjs'
import {
  aurora,
  basalt,
  castleOnCliff,
  cornerPlants,
  cornerReeds,
  cornerRocks,
  cottage,
  cracks,
  farHills,
  fence,
  haystack,
  hill,
  horizonGrass,
  hutOnHill,
  lightning,
  lilies,
  moths,
  oak,
  owls,
  peaksAt,
  reeds,
  rocks,
  ruins,
  sideForest,
  smoke,
  snow,
  snowyCorners,
  stormClouds,
  topBranches,
  water,
  whirl,
  wreaths,
} from './shapes.mjs'

/** Water depth below the horizon: the card keeps it above the pedestal (top face at y 690). */
const waterDepth = (ctx, hero) => (ctx.L.kind === 'card' ? ctx.S(60) : ctx.S(hero))

/** A single spruce for scattered trees (the forest helper draws bands). */
function pineAt(x, y, h, r, fill = '#040506') {
  let d = `M${f(x)},${f(y - h)}`
  for (let i = 1; i <= 5; i++) {
    const t = i / 5
    d += ` L${f(x + h * 0.2 * t * r.range(0.9, 1.1))},${f(y - h + h * 0.95 * t)} L${f(x + h * 0.07 * t)},${f(y - h + h * 0.95 * t - h * 0.03)}`
  }
  d += ` L${f(x + h * 0.03)},${f(y)} L${f(x - h * 0.03)},${f(y)}`
  for (let i = 5; i >= 1; i--) {
    const t = i / 5
    d += ` L${f(x - h * 0.07 * t)},${f(y - h + h * 0.95 * t - h * 0.03)} L${f(x - h * 0.2 * t * r.range(0.9, 1.1))},${f(y - h + h * 0.95 * t)}`
  }
  return `<path d="${d} Z" fill="${fill}"/>`
}

export const SCENES = {
  skrzat: {
    // Old wooden cottage at night, warm windows, haystacks and a fence on the sides.
    frame: { lightOpacity: 0.48, mist: 0.3 },
    draw(ctx) {
      const { r, c, hz, X, S, tone } = ctx
      ctx.put('sky', moon(X(620), hz - S(520), S(30), '#f1e6cc', c, 0.18))
      farHills(ctx, { amp: 110, lift: 10 })
      sideForest(ctx, {
        y: hz - S(4),
        hMin: 60,
        hMax: 130,
        fill: mix(tone.far, '#000', 0.25),
        gap: 360,
        gapH: 30,
        layer: 'farFog',
      })
      sideForest(ctx, { y: hz + S(6), hMin: 150, hMax: 290, fill: tone.mid, gap: 820 })
      const wall = mix('#120d08', c, 0.08)
      const roof = '#090706'
      const lit = mix(c, '#fff3d0', 0.35)
      const hx = ctx.P(-900, -400)
      const hy = hz + S(14)
      ctx.put('mid', glow(hx, hy - S(60), S(330), S(170), c, 0.4))
      ctx.add('mid', cottage(ctx, hx, hy, 330, { lit, wall, roof }))
      smoke(ctx, hx + S(86), hy - S(300), mix('#8a8170', c, 0.2))
      ctx.add('mid', fence(hx + S(200), hx + S(520), hz + S(22), S(46), roof, r))
      ctx.add('mid', fence(X(260), ctx.P(1200, 560), hz + S(20), S(42), roof, r))
      for (const [off, card, w] of [
        [880, 300, 120],
        [1010, 390, 150],
        [1150, 480, 110],
      ]) {
        ctx.add(
          'mid',
          haystack(
            ctx.P(off, card),
            hz + S(18),
            S(w),
            mix('#0c0905', c, 0.12),
            mix(c, '#000', 0.35),
          ),
        )
      }
      horizonGrass(ctx, '#050605', { n: 700, hMax: 26 })
      ctx.add(
        'fx',
        glowDots(r, {
          x0: hx - S(260),
          x1: hx + S(420),
          y0: hz - S(150),
          y1: hz + S(40),
          n: 24,
          color: c,
          size: S(2.4),
        }),
      )
      ctx.add(
        'fx',
        glowDots(r, {
          x0: X(260),
          x1: ctx.P(1200, 560),
          y0: hz - S(120),
          y1: hz + S(40),
          n: 16,
          color: c,
          size: S(2.2),
        }),
      )
    },
    fg(p) {
      p.add(cornerPlants(p, { color: '#020302' }))
      p.add(topBranches(p, { color: '#020302', leaves: '#030503' }))
    },
  },

  licho: {
    // Dense misty forest, crooked trees, one single green light deep between the trees.
    frame: { lightOpacity: 0.3, mist: 0.5 },
    draw(ctx) {
      const { r, c, hz, X, S, tone } = ctx
      sideForest(ctx, {
        y: hz - S(10),
        hMin: 120,
        hMax: 230,
        fill: mix(tone.far, c, 0.05),
        gap: 240,
        gapH: 70,
        layer: 'far',
        spacing: 0.3,
      })
      ctx.put('farFog', fog(0, hz - S(190), ctx.W, S(170), mix(c, '#4d6b55', 0.6), 0.22, S(50)))
      sideForest(ctx, {
        y: hz,
        hMin: 160,
        hMax: 300,
        fill: mix(tone.mid, c, 0.05),
        gap: 420,
        layer: 'farFog',
        spacing: 0.32,
      })
      const lx = ctx.P(-620, -330)
      ctx.put('back', glow(lx, hz - S(110), S(160), S(120), c, 0.7))
      ctx.add(
        'back',
        `<circle cx="${f(lx)}" cy="${f(hz - S(110))}" r="${f(S(7))}" fill="${mix(c, '#ffffff', 0.6)}"/>`,
      )
      for (const [off, card, h] of [
        [-380, -230, 460],
        [-760, -420, 560],
        [-1080, -540, 500],
        [360, 240, 480],
        [700, 400, 580],
        [1060, 540, 460],
      ]) {
        ctx.add(
          'mid',
          bareTree(r, ctx.P(off, card), hz + S(20), S(h), '#030504', {
            width: S(h / 16),
            spread: 0.75,
            depth: 6,
            lean: r.range(-0.25, 0.25),
          }),
        )
      }
      ctx.put(
        'fog',
        fog(X(-1300), hz - S(90), S(2600), S(110), mix(c, '#6b8a74', 0.55), 0.3, S(36)),
      )
      horizonGrass(ctx, '#030504', { n: 600 })
      ctx.add(
        'fx',
        glowDots(r, {
          x0: X(-1100),
          x1: X(1100),
          y0: hz - S(300),
          y1: hz + S(20),
          n: 14,
          color: c,
          size: S(1.4),
          core: mix(c, '#ffffff', 0.5),
        }),
      )
    },
    fg(p) {
      p.add(cornerPlants(p, { color: '#020302', tall: 1.1 }))
      p.add(topBranches(p, { color: '#020302' }))
    },
  },

  bies: {
    // Windy meadow at night, leaves and dry grass caught in whirlwinds on the sides.
    frame: { lightOpacity: 0.38, mist: 0.28 },
    draw(ctx) {
      const { r, c, hz, X, S, tone } = ctx
      ctx.put('sky', moon(X(-640), hz - S(500), S(34), '#eef0d8', c, 0.16))
      for (let i = 0; i < 7; i++) {
        ctx.put(
          'sky',
          fog(
            r.range(0, ctx.W),
            hz - S(r.range(320, 560)),
            S(r.range(400, 700)),
            S(18),
            mix(c, '#3a4030', 0.6),
            0.35,
            S(8),
          ),
        )
      }
      farHills(ctx, { amp: 70, lift: 0 })
      for (const [off, card, h] of [
        [-560, -300, 260],
        [-980, -470, 300],
        [640, 320, 240],
        [1080, 500, 290],
      ]) {
        ctx.add(
          'back',
          leafyTree(r, ctx.P(off, card), hz + S(6), S(h), mix(tone.mid, c, 0.04), {
            crown: 0.55,
            width: 0.8,
          }),
        )
      }
      whirl(ctx, ctx.P(-860, -360), hz + S(20), S(420), mix(c, '#a0a060', 0.3))
      whirl(ctx, ctx.P(920, 430), hz + S(20), S(360), mix(c, '#a0a060', 0.3))
      ctx.add(
        'near',
        grass(r, {
          x0: 0,
          x1: ctx.W,
          y: hz + S(34),
          hMin: S(14),
          hMax: S(54),
          color: '#040502',
          n: 900,
          bend: 0.5,
          width: S(2.2),
        }),
      )
      ctx.add(
        'fx',
        glowDots(r, {
          x0: X(-1100),
          x1: X(1100),
          y0: hz - S(260),
          y1: hz,
          n: 10,
          color: c,
          size: S(1.4),
        }),
      )
    },
    fg(p) {
      p.add(cornerPlants(p, { color: '#020301', ferns: false, tall: 1.3, bend: 0.6, n: 90 }))
    },
  },

  wodnik: {
    // Still forest pond at night: water lilies, reeds, the moon reflected in black water.
    frame: { lightOpacity: 0.36, mist: 0.42 },
    draw(ctx) {
      const { r, c, hz, X, S, tone } = ctx
      ctx.put('sky', moon(X(0), hz - S(300), S(64), '#e8f0ff', c, 0.4))
      sideForest(ctx, {
        y: hz,
        hMin: 90,
        hMax: 210,
        fill: mix(tone.mid, c, 0.05),
        gap: 200,
        gapH: 50,
        layer: 'back',
        spacing: 0.34,
      })
      const y1 = hz + waterDepth(ctx, 130)
      water(ctx, hz, y1, { tint: c, glowX: X(0) })
      lilies(
        ctx,
        ctx.P(-760, -420),
        ctx.P(-240, -180),
        hz + S(14),
        y1 - S(8),
        mix('#0a1a12', c, 0.1),
        '#f2f0ff',
      )
      lilies(
        ctx,
        ctx.P(260, 200),
        ctx.P(900, 520),
        hz + S(14),
        y1 - S(8),
        mix('#0a1a12', c, 0.1),
        '#f2f0ff',
      )
      reeds(ctx, ctx.P(-1200, -560), ctx.P(-700, -380), y1 + S(4), S(170), '#030606', 'near')
      reeds(ctx, ctx.P(720, 380), ctx.P(1250, 560), y1 + S(4), S(170), '#030606', 'near')
      ctx.put('fog', fog(X(-1300), hz - S(40), S(2600), S(80), mix(c, '#9fb6d0', 0.5), 0.26, S(28)))
      ctx.add(
        'fx',
        glowDots(r, {
          x0: X(-1000),
          x1: X(1000),
          y0: hz - S(150),
          y1: hz + S(20),
          n: 12,
          color: c,
          size: S(1.6),
          core: '#eef4ff',
        }),
      )
    },
    fg(p) {
      p.add(cornerReeds(p, { color: '#020404' }))
    },
  },

  strzyga: {
    // Ancient stone ruins on a hill, broken arches, owl silhouettes on the stones.
    frame: { lightOpacity: 0.4, mist: 0.36 },
    draw(ctx) {
      const { r, c, hz, X, S, tone } = ctx
      ctx.put('sky', moon(X(640), hz - S(470), S(46), '#f6e8f0', c, 0.3))
      farHills(ctx, { amp: 100, lift: 0 })
      const x = ctx.P(-760, -370)
      const size = 380
      const { base } = ruins(ctx, x, hz + S(10), size, {
        stone: '#070507',
        hillFill: mix(tone.mid, c, 0.04),
      })
      const w = S(size)
      // One owl on the flat left part of the broken tower (ruins: tower top at about base - 0.83w).
      ctx.add('back', owls(x - 0.76 * w - 0.055 * w, base - 0.83 * w + 1, S(12), '#070507', 1))
      rocks(ctx, ctx.P(820, 380), hz + S(18), S(320), S(70), mix(tone.mid, c, 0.03), 'mid')
      ctx.add('mid', bareTree(r, ctx.P(1040, 500), hz + S(16), S(360), '#050405', { width: S(18) }))
      ctx.put(
        'fog',
        fog(X(-1300), hz - S(40), S(2600), S(90), mix(c, '#5a3a48', 0.55), 0.26, S(30)),
      )
      horizonGrass(ctx, '#050405')
    },
    fg(p) {
      p.add(cornerRocks(p, { color: '#030203' }))
      p.add(topBranches(p, { color: '#030203' }))
    },
  },

  kikimora: {
    // Inside an old abandoned spinning room: wooden spinning wheel, moonlight through cracks.
    frame: {
      stars: false,
      lightOpacity: 0.3,
      mist: 0.12,
      sky: [
        [0, '#050306'],
        [0.6, '#0b0710'],
        [1, '#120c16'],
      ],
      groundTop: '#0d0a0e',
    },
    draw(ctx) {
      const { r, c, hz, W, X, S } = ctx
      // Plank wall: vertical boards with gaps that let light through.
      let planks = ''
      for (let x = 0; x < W; x += S(r.range(60, 90))) {
        planks += `<rect x="${f(x)}" y="0" width="${f(S(3))}" height="${f(hz)}" fill="#020103" opacity="0.8"/>`
        if (r() < 0.12) {
          planks += `<rect x="${f(x + S(1))}" y="${f(r.range(0, hz * 0.6))}" width="${f(S(2))}" height="${f(S(r.range(60, 200)))}" fill="${mix(c, '#ffffff', 0.5)}" opacity="0.35"/>`
        }
      }
      ctx.add('far', planks)
      ctx.add(
        'far',
        `<rect x="0" y="${f(hz - S(560))}" width="${W}" height="${f(S(26))}" fill="#030204"/>`,
      )
      // The window in the middle, moonlight and a beam falling to the floor.
      const wx = X(0)
      const wy = hz - S(470)
      const ww = S(250)
      const wh = S(300)
      ctx.put('far', glow(wx, wy + wh / 2, S(500), S(420), c, 0.35))
      ctx.add(
        'far',
        `<rect x="${f(wx - ww / 2)}" y="${f(wy)}" width="${f(ww)}" height="${f(wh)}" fill="${mix(c, '#e8dcff', 0.55)}" opacity="0.85"/>`,
      )
      ctx.add(
        'far',
        `<rect x="${f(wx - S(5))}" y="${f(wy)}" width="${f(S(10))}" height="${f(wh)}" fill="#050307"/><rect x="${f(wx - ww / 2)}" y="${f(wy + wh * 0.45)}" width="${f(ww)}" height="${f(S(10))}" fill="#050307"/>`,
      )
      ctx.add(
        'far',
        `<rect x="${f(wx - ww / 2 - S(14))}" y="${f(wy - S(14))}" width="${f(ww + S(28))}" height="${f(wh + S(28))}" fill="none" stroke="#050307" stroke-width="${f(S(20))}"/>`,
      )
      ctx.put('farFog', [
        `<filter id="beam-${ctx.L.kind}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${f(S(16))}"/></filter>`,
        `<path d="M${f(wx - ww / 2)},${f(wy + wh)} L${f(wx + ww / 2)},${f(wy + wh)} L${f(wx + S(420))},${f(hz + S(120))} L${f(wx - S(260))},${f(hz + S(120))} Z" fill="${mix(c, '#ffffff', 0.4)}" opacity="0.16" filter="url(#beam-${ctx.L.kind})"/>`,
      ])
      // Floorboards converging to the middle.
      let floor = ''
      for (let k = -14; k <= 14; k++) {
        floor += `<path d="M${f(X(k * 40))},${f(hz)} L${f(X(k * 170))},${f(ctx.H)}" stroke="#040305" stroke-width="${f(S(3))}" opacity="0.8"/>`
      }
      ctx.add('ground', floor)
      // Spinning wheel (wheel, spokes, stand) and a stool.
      const sx = ctx.P(-760, -380)
      const R = S(120)
      const cy = hz - S(150)
      const ink = '#050306'
      let wheel = `<circle cx="${f(sx)}" cy="${f(cy)}" r="${f(R)}" fill="none" stroke="${ink}" stroke-width="${f(S(12))}"/>`
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2
        wheel += `<path d="M${f(sx)},${f(cy)} L${f(sx + Math.cos(a) * R)},${f(cy + Math.sin(a) * R)}" stroke="${ink}" stroke-width="${f(S(4))}"/>`
      }
      wheel += `<path d="M${f(sx - S(30))},${f(hz + S(16))} L${f(sx)},${f(cy)} L${f(sx + S(40))},${f(hz + S(16))} M${f(sx)},${f(cy)} L${f(sx + S(200))},${f(hz - S(60))} L${f(sx + S(220))},${f(hz + S(16))} M${f(sx + S(160))},${f(hz - S(60))} L${f(sx + S(160))},${f(hz + S(16))}" stroke="${ink}" stroke-width="${f(S(12))}" fill="none"/>`
      wheel += `<path d="M${f(sx + S(200))},${f(hz - S(60))} L${f(sx + S(260))},${f(hz - S(200))}" stroke="${ink}" stroke-width="${f(S(8))}"/>`
      ctx.add('mid', wheel)
      const tx = ctx.P(820, 400)
      ctx.add(
        'mid',
        `<rect x="${f(tx - S(70))}" y="${f(hz - S(70))}" width="${f(S(140))}" height="${f(S(16))}" fill="${ink}"/><path d="M${f(tx - S(60))},${f(hz - S(56))} L${f(tx - S(74))},${f(hz + S(16))} M${f(tx + S(60))},${f(hz - S(56))} L${f(tx + S(74))},${f(hz + S(16))}" stroke="${ink}" stroke-width="${f(S(10))}"/>`,
      )
      ctx.add(
        'fx',
        glowDots(r, {
          x0: wx - S(260),
          x1: wx + S(400),
          y0: wy + wh,
          y1: hz + S(60),
          n: 30,
          color: c,
          size: S(1.3),
          core: '#f2eaff',
        }),
      )
    },
    fg(p) {
      const { W } = p
      // Ceiling beam and cobwebs in the top corners.
      let out = `<rect x="-20" y="0" width="${W + 40}" height="90" fill="#020103"/>`
      for (const side of [-1, 1]) {
        const x = side < 0 ? 0 : W
        out += `<path d="M${x},90 L${x - side * 520},90 L${x},520 Z" fill="#020103"/>`
        for (let k = 1; k <= 5; k++) {
          out += `<path d="M${f(x - side * k * 70)},90 Q${f(x - side * k * 40)},${f(90 + k * 40)} ${x},${f(90 + k * 80)}" stroke="#d8d0e8" stroke-width="2" fill="none" opacity="0.18"/>`
        }
      }
      out += cornerRocks(p, { color: '#020103', h: 240 })
      p.add(out)
    },
  },

  zmora: {
    // Night field full of moths flying toward a low glowing moon, tall grass.
    frame: { lightOpacity: 0.5, mist: 0.3 },
    draw(ctx) {
      const { r, c, hz, X, S, tone } = ctx
      ctx.put('sky', moon(X(0), hz - S(150), S(150), mix(c, '#ffe6d8', 0.55), c, 0.45))
      farHills(ctx, { amp: 34, lift: 0 })
      for (const [off, card, h] of [
        [-880, -420, 220],
        [940, 460, 200],
      ]) {
        ctx.add('back', leafyTree(r, ctx.P(off, card), hz + S(4), S(h), mix(tone.mid, c, 0.04)))
      }
      ctx.add(
        'mid',
        grass(r, {
          x0: 0,
          x1: X(-260),
          y: hz + S(30),
          hMin: S(40),
          hMax: S(150),
          color: '#060303',
          n: 520,
          bend: 0.15,
          width: S(2.6),
        }),
      )
      ctx.add(
        'mid',
        grass(r, {
          x0: X(260),
          x1: ctx.W,
          y: hz + S(30),
          hMin: S(40),
          hMax: S(150),
          color: '#060303',
          n: 520,
          bend: -0.15,
          width: S(2.6),
        }),
      )
      horizonGrass(ctx, '#050303', { hMax: 34 })
      moths(ctx, X(0), hz - S(170), S(330), 70, mix(c, '#fff2ea', 0.75))
      moths(ctx, ctx.P(-760, -380), hz - S(120), S(180), 18, mix(c, '#fff2ea', 0.75))
    },
    fg(p) {
      p.add(cornerPlants(p, { color: '#030101', ferns: false, tall: 1.6, n: 110 }))
    },
  },

  rusalka: {
    // River bank at dawn: white mist over water, birch trees, floating flower wreaths.
    frame: {
      lightOpacity: 0.36,
      mist: 0.55,
      sky: [
        [0, '#030709'],
        [0.55, '#0b1a1e'],
        [1, '#2a4448'],
      ],
    },
    draw(ctx) {
      const { r, c, hz, X, S, tone } = ctx
      ctx.put('sky', glow(X(0), hz - S(40), S(1200), S(220), mix(c, '#ffffff', 0.5), 0.35))
      sideForest(ctx, {
        y: hz,
        hMin: 70,
        hMax: 150,
        fill: mix(tone.far, c, 0.1),
        gap: 0,
        layer: 'far',
        spacing: 0.4,
      })
      const y1 = hz + waterDepth(ctx, 140)
      water(ctx, hz, y1, { tint: mix(c, '#ffffff', 0.3), glowX: X(0), glowOpacity: 0.45 })
      const flower = mix(c, '#ffffff', 0.6)
      wreaths(
        ctx,
        [
          [ctx.P(-420, -240), hz + S(60), 26],
          [ctx.P(380, 230), hz + S(44), 22],
          [ctx.P(-760, -400), hz + S(96), 30],
        ],
        '#0d1f16',
        flower,
      )
      for (const [off, card, h] of [
        [-700, -330, 520],
        [-860, -420, 600],
        [-1080, -520, 540],
        [720, 340, 560],
        [920, 450, 500],
        [1120, 540, 600],
      ]) {
        ctx.add(
          'mid',
          birch(
            r,
            ctx.P(off, card),
            y1 + S(10),
            S(h),
            '#7f8c8a',
            '#141b1b',
            mix('#13221c', c, 0.1),
          ),
        )
      }
      ctx.put('fog', fog(X(-1400), hz - S(60), S(2800), S(150), '#e8f4f4', 0.32, S(40)))
      reeds(ctx, ctx.P(-1250, -560), ctx.P(-600, -300), y1 + S(6), S(120), '#040808', 'near')
    },
    fg(p) {
      p.add(cornerReeds(p, { color: '#030606' }))
      p.add(topBranches(p, { color: '#030606', leaves: '#0a1612' }))
    },
  },

  baba: {
    // Deep old forest, a lonely hut far away on a hill with a faint light, twisted roots.
    frame: { lightOpacity: 0.34, mist: 0.44 },
    draw(ctx) {
      const { r, c, hz, X, S, tone } = ctx
      ctx.put('sky', moon(X(560), hz - S(480), S(28), '#efe6ff', c, 0.2))
      farHills(ctx, { amp: 80, lift: 0 })
      hutOnHill(ctx, ctx.P(-720, -370), hz + S(4), 70, {
        hillFill: mix(tone.far, '#000', 0.3),
        wall: '#050307',
        lit: mix(c, '#ffd9a0', 0.55),
      })
      sideForest(ctx, {
        y: hz + S(8),
        hMin: 120,
        hMax: 260,
        fill: mix(tone.mid, c, 0.05),
        gap: 1000,
        layer: 'mid',
      })
      for (const [off, card, h] of [
        [-420, -240, 520],
        [460, 260, 560],
        [780, 420, 620],
      ]) {
        ctx.add(
          'mid',
          bareTree(r, ctx.P(off, card), hz + S(18), S(h), '#040305', {
            width: S(h / 14),
            spread: 0.7,
            lean: r.range(-0.3, 0.3),
          }),
        )
      }
      // Twisted roots over the ground on both sides.
      let roots = ''
      for (const side of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          const x = ctx.P(side * r.range(380, 1100), side * r.range(240, 540))
          const len = S(r.range(120, 260))
          roots += `<path d="M${f(x)},${f(hz + S(20))} q${f(side * len * 0.4)},${f(-S(30))} ${f(side * len)},${f(S(r.range(10, 40)))}" stroke="#040305" stroke-width="${f(S(r.range(6, 14)))}" fill="none" stroke-linecap="round"/>`
        }
      }
      ctx.add('near', roots)
      ctx.put(
        'fog',
        fog(X(-1300), hz - S(60), S(2600), S(100), mix(c, '#5a4a70', 0.5), 0.28, S(32)),
      )
      horizonGrass(ctx, '#040305')
    },
    fg(p) {
      p.add(topBranches(p, { color: '#020103' }))
      p.add(cornerRocks(p, { color: '#020103', h: 300 }))
    },
  },

  bazyliszek: {
    // Narrow medieval street at night: cobblestones, an old cellar door, lanterns and mirrors.
    frame: { lightOpacity: 0.26, mist: 0.24, groundTop: '#0c1413' },
    draw(ctx) {
      const { r, c, hz, H, X, S, W } = ctx
      const wall = '#060a0a'
      // Far end of the street: low rooftops and a tower against the light, with a few windows.
      let skyline = ''
      let sx = X(-300)
      while (sx < X(300)) {
        const bw = S(r.range(40, 80))
        const bh = S(r.range(110, 190))
        skyline += `<path d="M${f(sx)},${f(hz + 2)} L${f(sx)},${f(hz - bh)} L${f(sx + bw / 2)},${f(hz - bh - bw * 0.5)} L${f(sx + bw)},${f(hz - bh)} L${f(sx + bw)},${f(hz + 2)} Z" fill="#081010"/>`
        if (r() < 0.4)
          skyline += `<rect x="${f(sx + bw * 0.4)}" y="${f(hz - bh * 0.6)}" width="${f(S(6))}" height="${f(S(9))}" fill="${mix(c, '#e8fff8', 0.4)}" opacity="0.7"/>`
        sx += bw * 0.92
      }
      skyline += `<path d="M${f(X(80))},${f(hz)} L${f(X(80))},${f(hz - S(300))} L${f(X(110))},${f(hz - S(390))} L${f(X(140))},${f(hz - S(300))} L${f(X(140))},${f(hz)} Z" fill="#081010"/>`
      ctx.add('far', skyline)
      // Facades on both sides narrowing to the middle; windows in rows, some lit.
      for (const side of [-1, 1]) {
        const near = side < 0 ? 0 : W
        const far = X(side * 280)
        const topNear = hz - S(760)
        const topFar = hz - S(330)
        ctx.add(
          'back',
          `<path d="M${f(near)},${f(topNear)} L${f(far)},${f(topFar)} L${f(far)},${f(hz + S(6))} L${f(near)},${f(H)} Z" fill="${wall}"/>`,
        )
        let gables = ''
        for (let k = 0; k < 7; k++) {
          const t0 = k / 7
          const t1 = (k + 1) / 7
          const x0 = near + (far - near) * t0
          const x1 = near + (far - near) * t1
          const y0 = topNear + (topFar - topNear) * t0
          const y1 = topNear + (topFar - topNear) * t1
          gables += `<path d="M${f(x0)},${f(y0)} L${f((x0 + x1) / 2)},${f(Math.min(y0, y1) - Math.abs(x1 - x0) * 0.5)} L${f(x1)},${f(y1)} Z" fill="${wall}"/>`
          for (let row = 0; row < 3; row++) {
            const mid = y0 + (y1 - y0) / 2
            const fy = mid + (hz - mid) * (0.2 + row * 0.24)
            const sz = Math.abs(x1 - x0) * 0.22
            const lit = r() < 0.28
            gables += `<rect x="${f((x0 + x1) / 2 - sz / 2)}" y="${f(fy)}" width="${f(sz)}" height="${f(sz * 1.4)}" fill="${lit ? mix(c, '#e8fff8', 0.4) : '#0b1414'}" opacity="${lit ? 0.85 : 1}"/>`
          }
        }
        ctx.add('back', gables)
      }
      // Cobblestones: rows of small stones widening towards the bottom.
      let cobbles = ''
      for (let row = 0; row < 26; row++) {
        const t = row / 26
        const y = hz + (H - hz) * t ** 1.4
        const half = S(280) + (X(0) - S(280)) * t
        const sz = S(6 + 30 * t)
        for (let x = X(0) - half; x < X(0) + half; x += sz * 1.4) {
          cobbles += `<ellipse cx="${f(x + r.range(-2, 2))}" cy="${f(y)}" rx="${f(sz * 0.6)}" ry="${f(sz * 0.22)}" fill="${mix('#16201e', c, 0.06)}" opacity="${f(0.35 + 0.4 * (1 - t))}"/>`
        }
      }
      ctx.add('ground', cobbles)
      // Lanterns on brackets, a cellar door with light under it, small mirrors catching light.
      for (const [off, card] of [
        [-430, -260],
        [460, 280],
      ]) {
        const lx = ctx.P(off, card)
        const ly = hz - S(250)
        ctx.put('mid', glow(lx, ly, S(140), S(140), c, 0.55))
        ctx.add(
          'mid',
          `<path d="M${f(lx - Math.sign(off) * S(60))},${f(ly - S(40))} L${f(lx)},${f(ly - S(40))} L${f(lx)},${f(ly - S(20))}" stroke="#050808" stroke-width="${f(S(5))}" fill="none"/><rect x="${f(lx - S(12))}" y="${f(ly - S(20))}" width="${f(S(24))}" height="${f(S(34))}" fill="${mix(c, '#ffffff', 0.55)}"/>`,
        )
      }
      const dx = ctx.P(-860, -440)
      ctx.add(
        'mid',
        `<path d="M${f(dx - S(60))},${f(hz + S(50))} L${f(dx - S(60))},${f(hz - S(70))} Q${f(dx)},${f(hz - S(120))} ${f(dx + S(60))},${f(hz - S(70))} L${f(dx + S(60))},${f(hz + S(50))} Z" fill="#030505"/><rect x="${f(dx - S(56))}" y="${f(hz + S(44))}" width="${f(S(112))}" height="${f(S(4))}" fill="${c}" opacity="0.8"/>`,
      )
      ctx.put('mid', glow(dx, hz + S(50), S(120), S(18), c, 0.6))
      ctx.add(
        'fx',
        glowDots(r, {
          x0: ctx.P(700, 320),
          x1: ctx.P(1150, 540),
          y0: hz - S(420),
          y1: hz - S(120),
          n: 5,
          color: c,
          size: S(2.4),
          core: '#effffa',
        }),
      )
    },
    fg(p) {
      const { W, H } = p
      // The edges of the nearest houses and a hanging sign on a bracket.
      let out = `<path d="M-10,-10 L240,-10 L200,${H + 10} L-10,${H + 10} Z" fill="#020303"/><path d="M${W + 10},-10 L${W - 260},-10 L${W - 220},${H + 10} L${W + 10},${H + 10} Z" fill="#020303"/>`
      out += `<path d="M${W - 240},380 L${W - 520},380 M${W - 480},380 L${W - 480},430" stroke="#020303" stroke-width="18"/><rect x="${W - 560}" y="430" width="160" height="110" fill="#020303"/>`
      p.add(out)
    },
  },

  zima: {
    // Snowy clearing in a winter forest, frost on branches, soft aurora in the sky.
    frame: { lightOpacity: 0.34, mist: 0.3, groundTop: '#1a2a33' },
    draw(ctx) {
      const { c, hz, X, S, tone } = ctx
      aurora(ctx, hz - S(560), [
        mix(c, '#7affd0', 0.4),
        mix(c, '#ffffff', 0.3),
        mix(c, '#b090ff', 0.4),
      ])
      farHills(ctx, { amp: 90, lift: 0, color: mix(tone.far, '#9ab4c4', 0.15) })
      sideForest(ctx, {
        y: hz,
        hMin: 90,
        hMax: 190,
        fill: mix(tone.far, '#000', 0.2),
        gap: 260,
        gapH: 30,
        layer: 'farFog',
        snow: '#5a7080',
      })
      sideForest(ctx, {
        y: hz + S(8),
        hMin: 200,
        hMax: 360,
        fill: '#060b0e',
        gap: 640,
        layer: 'mid',
        snow: '#a8c4d4',
      })
      ctx.put('ground', glow(X(0), hz + S(40), S(900), S(90), mix(c, '#ffffff', 0.5), 0.25))
      ctx.put('fog', fog(X(-1300), hz - S(40), S(2600), S(80), '#c8dce8', 0.22, S(28)))
      snow(ctx, 260)
    },
    fg(p) {
      p.add(snowyCorners(p, { color: '#03060a', snowColor: '#c8dcea' }))
    },
  },

  wilkolak: {
    // Rocky mountain ridge under a full moon, cold wind, scattered pines.
    frame: { lightOpacity: 0.34, mist: 0.3 },
    draw(ctx) {
      const { r, c, hz, S, tone } = ctx
      ctx.put('sky', moon(ctx.P(-560, -330), hz - S(420), S(92), '#f2f4f8', c, 0.45))
      farHills(ctx, {
        amp: 180,
        lift: 40,
        color: mix(tone.far, '#8090a0', 0.12),
        peaks: peaksAt(ctx, [
          [-900, 2.2, 220],
          [-350, 1.4, 160],
          [520, 2.6, 240],
          [1100, 1.6, 200],
        ]),
        waves: 4,
      })
      ctx.put('farFog', fog(0, hz - S(150), ctx.W, S(120), '#aab4c0', 0.18, S(40)))
      farHills(ctx, {
        amp: 110,
        lift: 0,
        color: mix(tone.mid, '#606a74', 0.08),
        layer: 'back',
        peaks: peaksAt(ctx, [
          [-700, 1.5, 180],
          [800, 1.8, 200],
        ]),
      })
      for (let i = 0; i < 14; i++) {
        const side = i % 2 ? 1 : -1
        const x = ctx.P(side * r.range(300, 1250), side * r.range(220, 560))
        ctx.add('back', pineAt(x, hz + S(4) - r.range(0, S(60)), S(r.range(60, 140)), r))
      }
      rocks(ctx, ctx.P(-760, -420), hz + S(20), S(360), S(90), '#050608', 'mid', '#8a96a4')
      rocks(ctx, ctx.P(820, 440), hz + S(20), S(300), S(80), '#050608', 'mid', '#8a96a4')
      for (let i = 0; i < 9; i++) {
        ctx.put(
          'fog',
          fog(
            r.range(0, ctx.W),
            hz - S(r.range(60, 300)),
            S(r.range(500, 900)),
            S(8),
            '#c8d0dc',
            0.2,
            S(5),
          ),
        )
      }
      horizonGrass(ctx, '#040506')
    },
    fg(p) {
      p.add(cornerRocks(p, { color: '#020304', rim: '#7a8694' }))
    },
  },

  weles: {
    // Dark mountain valley with a lake, wet black rocks, low clouds.
    frame: { lightOpacity: 0.4, mist: 0.34 },
    draw(ctx) {
      const { r, c, hz, X, S, tone } = ctx
      farHills(ctx, {
        amp: 220,
        lift: 30,
        color: mix(tone.far, c, 0.05),
        peaks: peaksAt(ctx, [
          [-760, 2.4, 260],
          [-1150, 1.6, 200],
          [700, 2.8, 280],
          [1150, 1.8, 220],
        ]),
        waves: 4,
      })
      for (let i = 0; i < 6; i++) {
        ctx.put(
          'farFog',
          fog(
            r.range(0, ctx.W),
            hz - S(r.range(140, 300)),
            S(r.range(500, 900)),
            S(50),
            mix(c, '#606060', 0.7),
            0.3,
            S(22),
          ),
        )
      }
      farHills(ctx, { amp: 70, lift: 0, color: mix(tone.mid, c, 0.04), layer: 'back' })
      sideForest(ctx, { y: hz, hMin: 50, hMax: 110, fill: '#050806', gap: 340, layer: 'back' })
      const y1 = hz + waterDepth(ctx, 120)
      water(ctx, hz, y1, { tint: c, glowX: X(0), glowOpacity: 0.5 })
      rocks(
        ctx,
        ctx.P(-860, -440),
        y1 + S(10),
        S(420),
        S(110),
        '#040506',
        'near',
        mix(c, '#ffffff', 0.4),
      )
      rocks(
        ctx,
        ctx.P(880, 440),
        y1 + S(10),
        S(380),
        S(100),
        '#040506',
        'near',
        mix(c, '#ffffff', 0.4),
      )
      ctx.put('fog', fog(X(-1300), hz - S(30), S(2600), S(70), mix(c, '#808080', 0.6), 0.24, S(24)))
    },
    fg(p) {
      p.add(cornerRocks(p, { color: '#020303', rim: '#6a5a40' }))
      p.add(cornerPlants(p, { color: '#020303', ferns: true, tall: 0.7, n: 40 }))
    },
  },

  zmij: {
    // Volcanic basalt rocks, glowing embers and sparks in cracks, smoke.
    frame: { lightOpacity: 0.55, mist: 0.2, groundTop: '#140c08' },
    draw(ctx) {
      const { r, c, hz, X, S, W } = ctx
      for (let i = 0; i < 10; i++) {
        const side = i % 2 ? 1 : -1
        const x = ctx.P(side * r.range(500, 1200), side * r.range(260, 560)) - S(150)
        ctx.put(
          'sky',
          fog(
            x,
            hz - S(r.range(250, 650)),
            S(r.range(250, 420)),
            S(r.range(200, 360)),
            '#140c0a',
            0.55,
            S(40),
          ),
        )
      }
      farHills(ctx, {
        amp: 120,
        lift: 0,
        color: '#0c0706',
        peaks: peaksAt(ctx, [
          [-820, 1.6, 200],
          [860, 1.8, 220],
        ]),
      })
      ctx.put('far', glow(X(-820), hz - S(160), S(260), S(160), c, 0.35))
      ctx.add(
        'mid',
        basalt(ctx, ctx.P(-820, -400), hz + S(24), S(380), S(280), '#070404', mix(c, '#000', 0.3)),
      )
      ctx.add(
        'mid',
        basalt(ctx, ctx.P(860, 420), hz + S(24), S(320), S(240), '#070404', mix(c, '#000', 0.3)),
      )
      cracks(ctx, 0, W, hz + S(30), hz + S(150), c, 22)
      ctx.add(
        'fx',
        glowDots(r, {
          x0: X(-1200),
          x1: X(1200),
          y0: hz - S(500),
          y1: hz + S(40),
          n: 60,
          color: c,
          size: S(1.8),
          core: mix(c, '#fff2c0', 0.6),
        }),
      )
    },
    fg(p) {
      const { r, W, H } = p
      p.add(cornerRocks(p, { color: '#030101', rim: '#ff7a1a' }))
      let embers = ''
      for (let i = 0; i < 30; i++) {
        const x = i % 2 ? r.range(0, 700) : W - r.range(0, 700)
        embers += `<circle cx="${f(x)}" cy="${f(r.range(H - 900, H - 100))}" r="${f(r.range(3, 7))}" fill="#ffb060" opacity="${f(r.range(0.4, 0.9))}"/>`
      }
      p.add(embers)
    },
  },

  perun: {
    // A huge lone oak on a hill during a storm, lightning in the sky behind.
    frame: { lightOpacity: 0.42, mist: 0.28 },
    draw(ctx) {
      const { r, c, hz, S, tone } = ctx
      stormClouds(ctx, hz - S(520), '#0a0a0c', mix(c, '#ffffff', 0.4))
      lightning(ctx, ctx.P(760, 380), hz - S(640), hz - S(60), mix(c, '#ffffff', 0.5))
      farHills(ctx, { amp: 70, lift: 0 })
      const ox = ctx.P(-760, -380)
      hill(ctx, ox, hz + S(10), S(900), S(110), mix(tone.mid, c, 0.03), 'back')
      ctx.add('back', oak(ctx, ox, hz - S(90), S(560), '#050504', mix(c, '#ffffff', 0.3)))
      let rain = ''
      for (let i = 0; i < 220; i++) {
        const x = r.range(0, ctx.W)
        const y = r.range(0, hz)
        rain += `<path d="M${f(x)},${f(y)} l${f(-S(8))},${f(S(40))}" stroke="#c8ccd8" stroke-width="${f(S(1))}" opacity="${f(r.range(0.06, 0.18))}"/>`
      }
      ctx.add('fx', rain)
      horizonGrass(ctx, '#040403', { hMax: 30 })
    },
    fg(p) {
      p.add(cornerPlants(p, { color: '#020201', ferns: false, tall: 1.1, bend: 0.4 }))
      p.add(topBranches(p, { color: '#020201', leaves: '#030302' }))
    },
  },

  wampir: {
    // Gothic castle on a far cliff, blood-red moon, bare trees, red mist.
    frame: { lightOpacity: 0.5, mist: 0.4 },
    draw(ctx) {
      const { r, c, hz, X, S, tone } = ctx
      ctx.put('sky', moon(X(0), hz - S(330), S(112), mix(c, '#ffd9cf', 0.35), c, 0.55))
      ctx.put('sky', fog(X(-420), hz - S(380), S(700), S(40), mix(c, '#000', 0.55), 0.6, S(10)))
      ctx.put('sky', fog(X(60), hz - S(300), S(520), S(26), mix(c, '#000', 0.6), 0.55, S(8)))
      farHills(ctx, { amp: 80, lift: 0, color: mix(tone.far, c, 0.08) })
      ctx.add(
        'back',
        castleOnCliff(ctx, X(-600), hz + S(8), 420, {
          rock: '#070505',
          wall: '#060404',
          lit: mix(c, '#ffb0a0', 0.25),
        }),
      )
      sideForest(ctx, {
        y: hz + S(8),
        hMin: 70,
        hMax: 150,
        fill: mix(tone.mid, c, 0.04),
        gap: 330,
        gapH: 10,
        layer: 'farFog',
      })
      for (const [off, h] of [
        [420, 330],
        [690, 430],
        [-900, 380],
        [1000, 300],
      ]) {
        ctx.add(
          'mid',
          bareTree(r, X(off), hz + S(16), S(h), '#040303', {
            width: S(h / 20),
            lean: r.range(-0.15, 0.15),
          }),
        )
      }
      ctx.put('fog', fog(X(-1200), hz - S(30), S(2400), S(90), mix(c, '#2a1414', 0.5), 0.28, S(30)))
      horizonGrass(ctx, '#040303', { n: 600, hMax: 22 })
    },
    fg(p) {
      const { r, W, H } = p
      p.add(topBranches(p, { color: '#020101' }))
      p.add(cornerPlants(p, { color: '#020101', ferns: false, tall: 0.8 }))
      for (const x of [180, 420, W - 420, W - 200]) {
        p.add(
          `<rect x="${f(x)}" y="${f(H - r.range(380, 520))}" width="30" height="600" fill="#020101" transform="rotate(${f(r.range(-8, 8))} ${f(x)} ${f(H)})"/>`,
        )
      }
    },
  },
}
