import 'server-only'

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ImageResponse } from 'next/og'
import type { ReactNode } from 'react'
import sharp from 'sharp'

import creaturesSeed from '../../../seed/prokomgaming/creatures.json'
import { sourceOf, type FpsKind, type SourceTone } from '../fps'
import { zl } from '../pricing/format'

import { OG_COLORS as C } from './colors'

/**
 * Link previews (`opengraph-image` routes, runda v2 §1.2): one frame for every page — the scene,
 * the brand mark, the page's own text, „Rabka-Zdrój”. Numbers come from the callers' data
 * (prices from the published snapshot, FPS from `fps-results` with their source label); this file
 * only draws them. Satori (`next/og`) knows only flexbox, TTF/OTF/WOFF fonts and PNG/JPEG/SVG
 * images — hence the static TTF subsets in `src/assets/og/` (scripts/subset-site-fonts.py --og)
 * and the WebP scenes turned into JPEG here.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const
export const OG_TYPE = 'image/png'

/** Scene of the pages without their own creature (home and content pages). */
const DEFAULT_SCENE = 'perun'

// Traced into the standalone image by `outputFileTracingIncludes` (next.config.ts); scenes are in
// `public/`, which the Dockerfile copies next to the server.
const ASSETS = join(process.cwd(), 'src/assets/og')
const SCENES = join(process.cwd(), 'public/scenes')

type Font = { name: string; data: Buffer; weight: 500 | 700 | 800; style: 'normal' }
let fonts: Promise<Font[]> | undefined
const loadFonts = () =>
  (fonts ??= Promise.all([
    readFile(join(ASSETS, 'cinzel-700.ttf')).then((data) => ({
      name: 'Cinzel',
      data,
      weight: 700,
    })),
    readFile(join(ASSETS, 'manrope-500.ttf')).then((data) => ({
      name: 'Manrope',
      data,
      weight: 500,
    })),
    readFile(join(ASSETS, 'manrope-800.ttf')).then((data) => ({
      name: 'Manrope',
      data,
      weight: 800,
    })),
  ]).then((list) => list.map((f) => ({ ...f, style: 'normal' }) as Font)))

let mark: Promise<string> | undefined
const loadMark = () =>
  (mark ??= readFile(join(ASSETS, 'znak.svg')).then(
    (svg) => `data:image/svg+xml;base64,${svg.toString('base64')}`,
  ))

// A few hundred KB per scene as JPEG; at most 16 + 1 of them, kept for the life of the process.
const scenes = new Map<string, Promise<string | null>>()
function loadScene(key: string): Promise<string | null> {
  let scene = scenes.get(key)
  if (!scene) {
    scene = sharp(join(SCENES, `${key}-card.webp`))
      .resize(OG_SIZE.width, OG_SIZE.height, { fit: 'cover' })
      .jpeg({ quality: 82 })
      .toBuffer()
      .then((jpeg) => `data:image/jpeg;base64,${jpeg.toString('base64')}`)
      // No scene file (a new creature before its graphics): the plain night background.
      .catch(() => null)
    scenes.set(key, scene)
  }
  return scene
}

/** Accent of a creature (`color` in seed creatures.json — the same values as tokens `--c-*`). */
export function creatureAccent(slug: string): string {
  return creaturesSeed.items.find((c) => c.slug === slug)?.color ?? C.gold
}

// Satori does not flatten React fragments: every group of lines is an explicit column.
const COLUMN = { display: 'flex', flexDirection: 'column' } as const

const TONES: Record<SourceTone, string> = { pk: C.srcPk, ind: C.srcInd, est: C.srcEst }

async function frame(sceneKey: string, accent: string, body: ReactNode): Promise<ImageResponse> {
  const [fontList, markSrc, scene] = await Promise.all([
    loadFonts(),
    loadMark(),
    loadScene(sceneKey),
  ])
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: C.page,
        color: C.text,
        fontFamily: 'Manrope',
        fontWeight: 500,
      }}
    >
      {scene && (
        // eslint-disable-next-line @next/next/no-img-element -- Satori draws plain <img>.
        <img
          src={scene}
          alt=""
          width={OG_SIZE.width}
          height={OG_SIZE.height}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
      )}
      {/* Readable text on the left: --smola (#040706) fading out over the scene. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(90deg, rgba(4,7,6,0.95) 0%, rgba(4,7,6,0.82) 42%, rgba(4,7,6,0.15) 78%, rgba(4,7,6,0) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '100%',
          height: 8,
          background: accent,
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: '52px 64px 56px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws plain <img>. */}
        <img src={markSrc} alt="PRO-KOM Gaming" width={218} height={80} />
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 760 }}>{body}</div>
        <div style={{ display: 'flex', fontSize: 24, color: C.muted }}>
          Rabka-Zdrój · prokomgaming.pl
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: fontList },
  )
}

/** Home: the promise of the site (runda v2 §1.2). */
export function homeOg(): Promise<ImageResponse> {
  return frame(
    DEFAULT_SCENE,
    C.gold,
    <div style={COLUMN}>
      <div style={{ display: 'flex', fontSize: 66, fontWeight: 800, lineHeight: 1.1 }}>
        Komputery do gier.
      </div>
      <div
        style={{ display: 'flex', fontSize: 66, fontWeight: 800, lineHeight: 1.1, color: C.gold }}
      >
        Sprawdzone w grach.
      </div>
    </div>,
  )
}

/** Content pages: a shared template with the page's title. */
export function contentOg(title: string): Promise<ImageResponse> {
  return frame(
    DEFAULT_SCENE,
    C.gold,
    <div style={COLUMN}>
      <div
        style={{ display: 'flex', fontSize: 70, fontWeight: 800, lineHeight: 1.1, color: C.textHi }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', marginTop: 18, fontSize: 30, color: C.text2 }}>
        Komputery do gier składane w Rabce-Zdroju
      </div>
    </div>,
  )
}

export type BuildOg = {
  slug: string
  name: string
  /** Scene file key (`baba` for Baba Jaga). */
  sceneKey: string
  epithet: string
  /** „Komputer do gier 2K”. */
  power: string
  /** Sell price of the base recipe from the published snapshot; `null` = no price line. */
  price: number | null
}

/** Build page: the creature's scene, its name in Cinzel, the power and the price „od”. */
export function buildOg(b: BuildOg): Promise<ImageResponse> {
  const accent = creatureAccent(b.slug)
  return frame(
    b.sceneKey,
    accent,
    <div style={COLUMN}>
      <div
        style={{
          display: 'flex',
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: accent,
        }}
      >
        {b.epithet}
      </div>
      <div
        style={{
          display: 'flex',
          fontFamily: 'Cinzel',
          fontWeight: 700,
          fontSize: b.name.length > 9 ? 88 : 108,
          lineHeight: 1.05,
          color: C.textHi,
          textShadow: `0 0 36px ${accent}`,
        }}
      >
        {b.name}
      </div>
      <div style={{ display: 'flex', marginTop: 10, fontSize: 34, color: C.text2 }}>{b.power}</div>
      {b.price !== null && (
        <div
          style={{ display: 'flex', marginTop: 14, fontSize: 52, fontWeight: 800, color: C.gold }}
        >
          {`od ${zl(b.price)}`}
        </div>
      )}
    </div>,
  )
}

export type GameOgPick = { slug: string; name: string; fps: number; kind: FpsKind }

/** Game page: „Komputer do {gry}” and up to three builds with stored FPS and their source. */
export function gameOg(
  game: string,
  resolution: string,
  picks: readonly GameOgPick[],
): Promise<ImageResponse> {
  return frame(
    DEFAULT_SCENE,
    C.gold,
    <div style={COLUMN}>
      <div style={{ display: 'flex', fontSize: 30, color: C.text2 }}>Komputer do</div>
      <div
        style={{
          display: 'flex',
          fontSize: game.length > 22 ? 50 : 66,
          fontWeight: 800,
          lineHeight: 1.08,
          color: C.textHi,
        }}
      >
        {game}
      </div>
      {picks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 22 }}>
          <div
            style={{ display: 'flex', fontSize: 22, color: C.muted }}
          >{`Monitor ${resolution}`}</div>
          {picks.map((p) => {
            const source = sourceOf(p.kind)
            return (
              <div key={p.slug} style={{ display: 'flex', alignItems: 'baseline', marginTop: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    width: 250,
                    fontFamily: 'Cinzel',
                    fontWeight: 700,
                    fontSize: 32,
                    color: creatureAccent(p.slug),
                  }}
                >
                  {p.name}
                </div>
                <div style={{ display: 'flex', width: 170, fontSize: 36, fontWeight: 800 }}>
                  {`${p.fps} FPS`}
                </div>
                <div style={{ display: 'flex', fontSize: 22, color: TONES[source.tone] }}>
                  {source.label}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>,
  )
}
