import { connection } from 'next/server'

import { getEnv } from '@/lib/env'
import { breadcrumbJsonLd, type Crumb } from '@/lib/seo'

import { JsonLd } from './JsonLd'

/**
 * `BreadcrumbList` of a page (spec. §23) — the trail from the home page, the page last. Per
 * request: the site address comes from the server's environment, not the image build.
 */
export async function BreadcrumbJsonLd({ crumbs }: { crumbs: readonly Crumb[] }) {
  await connection()
  return <JsonLd data={breadcrumbJsonLd(getEnv().SITE_URL, crumbs)} />
}
