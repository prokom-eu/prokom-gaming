// The unit certificate `/metryka/<code>` (spec. §13, board Metryka). Pure: from what the server
// read about one unit to what the page shows. Never anything about the customer (ADR-G005).

import { barPercent, fpsText, RESOLUTION_LABELS, type GameScale, type Resolution } from './fps'
import { isOrderStage, timeline, type OrderStage, type TimelineStep } from './orders'

const dateFormat = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** `14.11.2026`; `null` for no date. */
export function plDate(value: string | Date | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date)
}

export type CertificateSource = {
  code: string
  number: number | null
  build: { name: string; slug: string; key: string; tierRoman: string | null }
  serial: string | null
  testedAt: string | null
  warrantyUntil: string | null
  assembledBy: string | null
  stressTest: { minutes: number | null; errors: number | null }
  temps: { cpuMax: number | null; gpuMax: number | null }
  fpsSetup: { resolution: Resolution | null; settings: string | null; driver: string | null }
  fps: { game: { name: string } & GameScale; fps: number }[]
  parts: {
    label: string
    manufacturer: string | null
    model: string | null
    serial: string | null
    warrantyUntil: string | null
  }[]
  /** Stage of the order this unit belongs to, when there is one. */
  stage: string | null
}

export type CertificateView = {
  code: string
  name: string
  slug: string
  key: string
  /** „Wampir, egzemplarz nr 7” — without a number just the name. */
  title: string
  /** „Egzemplarz nr 7, Moc 5” on the paper. */
  subtitle: string
  timeline: TimelineStep[] | null
  stress: { minutes: string | null; result: string | null; ok: boolean } | null
  temps: { cpu: string | null; gpu: string | null }
  fps: {
    caption: string
    resolution: string
    rows: { name: string; text: string; percent: number }[]
  }
  parts: { label: string; maker: string | null; details: string | null; serial: string | null }[]
  warrantyUntil: string | null
  assembledBy: string | null
  testedAt: string | null
}

const join = (parts: (string | null | undefined)[], sep = ', ') =>
  parts.filter((p): p is string => Boolean(p && p.trim())).join(sep) || null

export function certificateView(source: CertificateSource): CertificateView {
  const { build } = source
  const nr = source.number ? `egzemplarz nr ${source.number}` : null
  const minutes = source.stressTest.minutes
  const errors = source.stressTest.errors
  const resolution = RESOLUTION_LABELS[source.fpsSetup.resolution ?? 'qhd']
  const testedAt = plDate(source.testedAt)
  return {
    code: source.code,
    name: build.name,
    slug: build.slug,
    key: build.key,
    title: nr ? `${build.name}, ${nr}` : build.name,
    subtitle:
      join([nr && `Egzemplarz nr ${source.number}`, build.tierRoman && `Moc ${build.tierRoman}`]) ??
      '',
    timeline: isOrderStage(source.stage) ? timeline(source.stage as OrderStage) : null,
    stress:
      minutes === null && errors === null
        ? null
        : {
            minutes: minutes === null ? null : `${minutes} min`,
            result: errors === null ? null : errors === 0 ? 'bez błędów' : `błędy: ${errors}`,
            ok: errors === 0,
          },
    temps: {
      cpu: source.temps.cpuMax === null ? null : `${source.temps.cpuMax}°C`,
      gpu: source.temps.gpuMax === null ? null : `${source.temps.gpuMax}°C`,
    },
    fps: {
      // Board: „2K, ustawienia wysokie, sterownik [wersja], [data].”
      caption:
        join([
          resolution,
          source.fpsSetup.settings && `ustawienia ${source.fpsSetup.settings}`,
          source.fpsSetup.driver && `sterownik ${source.fpsSetup.driver}`,
          testedAt,
        ]) ?? resolution,
      resolution,
      rows: source.fps.map(({ game, fps }) => ({
        name: game.name,
        text: fpsText(fps, game),
        percent: barPercent(fps, game),
      })),
    },
    parts: source.parts.map((part) => {
      const until = plDate(part.warrantyUntil)
      return {
        label: part.label,
        maker: join([part.manufacturer, part.model]),
        details: join([part.serial && `SN ${part.serial}`, until && `gwarancja do ${until}`]),
        serial: part.serial || null,
      }
    }),
    warrantyUntil: plDate(source.warrantyUntil),
    assembledBy: source.assembledBy?.trim() || null,
    testedAt,
  }
}
