import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd'
import { VoucherBuilder } from '@/components/content/VoucherBuilder'
import { Scene } from '@/components/Scene'
import { getEnv } from '@/lib/env'
import { features } from '@/lib/features'
import { issueFormToken } from '@/lib/inquiry/spam'
import { routes } from '@/lib/nav'

import '@/components/content/content.css'
import '@/components/content/sale.css'
import '@/components/inquiry/inquiry.css'

// TODO(krystian): G15 — JSON-LD (Product/Offer of the units, voucher) before the flag goes on.
export const metadata: Metadata = {
  title: 'Bon podarunkowy',
  description:
    'Bon podarunkowy PRO-KOM Gaming: obdarowany sam wybierze komputer, a kwota z bonu odliczy się od ceny. PDF do druku albo koperta w sklepie.',
  alternates: { canonical: routes.voucher },
}

/** „Bon podarunkowy” (spec. §12, boards Bon / Bon-telefon). Hidden until FEATURE_VOUCHER. */
export default async function VoucherPage() {
  // Read per request: the flag and the signed form token (ADR-G005).
  await connection()
  if (!features().voucher) notFound()
  return (
    <>
      <BreadcrumbJsonLd crumbs={[{ name: 'Bon podarunkowy', path: routes.voucher }]} />
      <VoucherBuilder
        scene={<Scene id="perun" fit="wide" eager />}
        token={issueFormToken(getEnv().PAYLOAD_SECRET)}
      />
    </>
  )
}
