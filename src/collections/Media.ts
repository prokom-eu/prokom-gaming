import path from 'path'
import type { CollectionConfig } from 'payload'

import { anyone, adminOnly } from '../access/panel'
import { getEnv } from '../lib/env'
import { GROUP_OFFER } from './shared'

/**
 * Uploaded images: photos of cases and coolers (46, manufacturer material) and later photos of our
 * own units. Stored on disk (`MEDIA_DIR`, a Docker volume on the server). No generated sizes:
 * `next/image` makes them.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Plik', plural: 'Media' },
  admin: { group: GROUP_OFFER, useAsTitle: 'alt' },
  access: { read: anyone, create: adminOnly, update: adminOnly, delete: adminOnly },
  upload: {
    // Relative values are resolved against the app's working directory, once, here.
    staticDir: path.resolve(getEnv().MEDIA_DIR),
    // No SVG: it can carry scripts and is served from the panel's domain.
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  },
  fields: [{ name: 'alt', label: 'Tekst alternatywny', type: 'text', required: true }],
}
