import {
  fpsListRows,
  initialResolution,
  type FpsListGame,
  type FpsTable,
  type Resolution,
} from '@/lib/fps'

import { FpsListClient } from './FpsListClient'

type Props = {
  /** Build slug, e.g. `wampir`. */
  build: string
  /** CSS colour of the bars — the creature colour token, e.g. `var(--c-wampir)`. */
  color: string
  /** Games in list order (board Zestaw: 12 chosen titles). */
  games: readonly FpsListGame[]
  /** From `loadFpsTable()` (server). */
  table: FpsTable
  defaultResolution?: Resolution
  title?: string
}

/**
 * „Ile klatek w Twojej grze” (board Zestaw, `stany/tel-06`): game, bar in the creature colour,
 * FPS and the source label under every number, FullHD / 2K / 4K segments and „Jak liczymy?”.
 * Server component: rows for all three resolutions are prepared here, so the browser gets only
 * finished rows (no table, no other builds). A build without any number renders nothing; a
 * resolution without numbers stays visible as a disabled segment.
 */
export function FpsList({
  build,
  color,
  games,
  table,
  defaultResolution = 'qhd',
  title = 'Ile klatek w Twojej grze',
}: Props) {
  const rows = fpsListRows(table, build, games)
  if (!rows) return null
  return (
    <FpsListClient
      title={title}
      color={color}
      defaultResolution={initialResolution(rows, defaultResolution)}
      rows={rows}
    />
  )
}
