import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { certificateView, type CertificateView } from '@/lib/certificate'
import type { Resolution } from '@/lib/fps'
import { normalizeUnitCode } from '@/lib/units'

type Rel<T> = number | T | null | undefined
const obj = <T>(value: Rel<T>): T | null =>
  typeof value === 'object' && value !== null ? value : null

/**
 * One published certificate by its code, or `null` (unknown, malformed or not published → 404).
 * `units` is staff-only, so the read is trusted and picks the certificate fields one by one —
 * never the e-mail or the account (ADR-G005). Only the stage of its order is read, nothing else.
 */
export async function loadCertificate(rawCode: string): Promise<CertificateView | null> {
  const code = normalizeUnitCode(rawCode)
  if (!code) return null
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'units',
    where: { and: [{ code: { equals: code } }, { published: { equals: true } }] },
    select: {
      code: true,
      number: true,
      build: true,
      serial: true,
      testedAt: true,
      warrantyUntil: true,
      assembledBy: true,
      stressTest: true,
      temps: true,
      fpsSetup: true,
      fps: true,
      parts: true,
    },
    populate: {
      builds: { name: true, slug: true, creature: { key: true }, level: true },
      'power-levels': { tierRoman: true },
      games: { name: true, kind: true, fpsCap: true },
    },
    depth: 2,
    limit: 1,
    overrideAccess: true,
  })
  const unit = docs[0]
  const build = obj(unit?.build)
  if (!unit || !build) return null

  const order = await payload.find({
    collection: 'orders',
    where: { unit: { equals: unit.id } },
    select: { stage: true },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  return certificateView({
    code: unit.code ?? code,
    number: unit.number ?? null,
    build: {
      name: build.name,
      slug: build.slug,
      key: build.creature.key,
      tierRoman: obj(build.level)?.tierRoman ?? null,
    },
    serial: unit.serial ?? null,
    testedAt: unit.testedAt ?? null,
    warrantyUntil: unit.warrantyUntil ?? null,
    assembledBy: unit.assembledBy ?? null,
    stressTest: {
      minutes: unit.stressTest?.minutes ?? null,
      errors: unit.stressTest?.errors ?? null,
    },
    temps: { cpuMax: unit.temps?.cpuMax ?? null, gpuMax: unit.temps?.gpuMax ?? null },
    fpsSetup: {
      resolution: (unit.fpsSetup?.resolution as Resolution | null | undefined) ?? null,
      settings: unit.fpsSetup?.settings ?? null,
      driver: unit.fpsSetup?.driver ?? null,
    },
    fps: (unit.fps ?? []).flatMap((row) => {
      const game = obj(row.game)
      return game
        ? [
            {
              game: { name: game.name, kind: game.kind, fpsCap: game.fpsCap ?? null },
              fps: row.fps,
            },
          ]
        : []
    }),
    parts: (unit.parts ?? []).map((part) => ({
      label: part.label,
      manufacturer: part.manufacturer ?? null,
      model: part.model ?? null,
      serial: part.serial ?? null,
      warrantyUntil: part.warrantyUntil ?? null,
    })),
    stage: order.docs[0]?.stage ?? null,
  })
}
