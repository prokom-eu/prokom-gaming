import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Docker image (ADR-G001 §5): `.next/standalone` holds the server and only the traced node_modules.
  output: 'standalone',
  // Scenes and photos as AVIF with WebP fallback, in screen sizes (ADR-G003 §3, §6).
  images: {
    formats: ['image/avif', 'image/webp'],
    // `next dev` only: files as they are, no on-the-fly optimisation (the first visit of a page
    // with a 4320 px scene waited ~15 s). `next build` / `next start` — and so Lighthouse, CI and
    // the server — optimise as before.
    unoptimized: process.env.NODE_ENV === 'development',
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

export default {
  ...config,
  headers: async () =>
    (payloadHeaders ? await payloadHeaders() : []).map((rule) =>
      rule.source === '/:path*' && rule.headers.some(({ key }) => key === 'Critical-CH')
        ? { ...rule, source: PAYLOAD_ADMIN_PATHS }
        : rule,
    ),
} satisfies NextConfig
