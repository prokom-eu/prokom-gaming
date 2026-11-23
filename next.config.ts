import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Docker image (ADR-G001 §5): `.next/standalone` holds the server and only the traced node_modules.
  output: 'standalone',
  // Fonts and the brand mark of the link previews (`src/lib/og/render.tsx`), read from disk at
  // request time — not imported, so the tracer would leave them out of the standalone image.
  outputFileTracingIncludes: {
    '/**/opengraph-image*': ['./src/assets/og/**'],
  },
  // Scenes and photos as AVIF with WebP fallback, in screen sizes (ADR-G003 §3, §6).
  images: {
    formats: ['image/avif', 'image/webp'],
    // `next dev` only: files as they are, no on-the-fly optimisation (the first visit of a page
    // with a 4320 px scene waited ~15 s). `next build` / `next start` — and so Lighthouse, CI and
    // the server — optimise as before.
    unoptimized: process.env.NODE_ENV === 'development',
    // A cold re-encode costs the server 0.4–1.7 s per file (measured on production, 15.11.2026);
    // with the default 4 h every busy image kept going cold. Uploads get new file names and the
    // scenes change only with a deploy, so a month is safe. The cache lives on a volume
    // (`next-images` in `docker/compose.prod.yml`), so a deploy no longer empties it either.
    minimumCacheTTL: 2678400,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

const config = withPayload(nextConfig, { devBundleServerPackages: false })
const payloadHeaders = config.headers

/**
 * `withPayload` asks every path (`/:path*`) for the colour-scheme client hint, with `Critical-CH`:
 * the browser then repeats the first request of a visit to send it (~0.6 s on a phone, measured
 * in prokom-web). Only the admin theme reads the hint, so the rule is narrowed to the panel.
 * The path must match `routes.admin` in `payload.config.ts` (default `/admin`). Guarded by
 * `tests/e2e/headers.e2e.spec.ts`, in case Payload changes the rule.
 */
const PAYLOAD_ADMIN_PATHS = '/admin/:path*'

/**
 * Files of `public/scenes`, sent as they are to the home hero (`SceneLayers` `original`). Next
 * gives `public/` files `max-age=0`, so every visit asked again; their names have no hash, so a
 * day fresh, then a month of serving the cached copy while checking in the background.
 */
const SCENE_FILES = {
  source: '/scenes/:path*',
  headers: [
    { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=2592000' },
  ],
}

export default {
  ...config,
  headers: async () => [
    ...(payloadHeaders ? await payloadHeaders() : []).map((rule) =>
      rule.source === '/:path*' && rule.headers.some(({ key }) => key === 'Critical-CH')
        ? { ...rule, source: PAYLOAD_ADMIN_PATHS }
        : rule,
    ),
    SCENE_FILES,
  ],
} satisfies NextConfig
