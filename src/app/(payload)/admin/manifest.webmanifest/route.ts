import config from '@payload-config'

import { PANEL_APP } from '../../../../admin/brand'

/**
 * Web app manifest of the panel only (ADR-G010 §2): scope /admin, so "add to home screen" opens
 * the panel full screen and the site keeps behaving as a site. Not `app/manifest.ts` — that one
 * would cover the whole domain. A static segment, so it wins over Payload's
 * `admin/[[...segments]]`. No personal data, the same for everyone: cached for a day.
 */
export async function GET() {
  const admin = (await config).routes.admin
  const manifest = {
    name: PANEL_APP.name,
    short_name: PANEL_APP.shortName,
    lang: 'pl',
    start_url: admin,
    scope: admin,
    id: admin,
    display: 'standalone',
    orientation: 'portrait',
    theme_color: PANEL_APP.themeColor,
    background_color: PANEL_APP.themeColor,
    icons: [
      { src: PANEL_APP.icons.any192, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: PANEL_APP.icons.any512, sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: PANEL_APP.icons.maskable512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
