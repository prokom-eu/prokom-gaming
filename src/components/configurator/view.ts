import { useMemo } from 'react'

import { LIGHTS } from '@/lib/buildPage'
import {
  capacityText,
  fpsCell,
  fpsNote,
  shownGames,
  type ConfiguratorState,
  type FpsCell,
} from '@/lib/configurator'
import type {
  ConfiguratorBuild,
  ConfiguratorData,
  ConfiguratorLevel,
  ConfiguratorOption,
} from '@/lib/configurator.server'
import { RESOLUTION_LABELS } from '@/lib/fps'
import { zl } from '@/lib/pricing/format'
import { lookupPrice, priceFromSnapshot, type PriceList } from '@/lib/pricing/snapshot'

type Data = ConfiguratorData & { prices: PriceList }

export type SummaryLine = { key: string; label: string; value: string; price: string }

export type FpsShown = { slug: string; name: string; cell: FpsCell | null; bar: number }

/** Everything the steps and the preview draw, derived once per render from data + state. */
export type ConfiguratorView = {
  level: ConfiguratorLevel
  /** The level's own build (name, sigil, the nearest ready build). */
  build: ConfiguratorBuild | null
  option: (code: string) => ConfiguratorOption | undefined
  optionLabel: (code: string) => string
  price: number | null
  lines: SummaryLine[]
  fps: FpsShown[]
  fpsNote: string
  /** Values under the step names (board `VALS`). */
  stepValues: Record<string, string>
  lightColor: string
  lightLabel: string
}

// FPS bar in the side panel (board: `v / 3` %, i.e. 300 FPS = full).
const barOf = (fps: number) => Math.min(100, Math.round(fps / 3))

export function useConfigurator(data: Data, state: ConfiguratorState): ConfiguratorView {
  return useMemo(() => deriveView(data, state), [data, state])
}

export function deriveView(data: Data, state: ConfiguratorState): ConfiguratorView {
  const options = new Map(data.options.map((o) => [o.code, o]))
  const option = (code: string) => options.get(code)
  const optionLabel = (code: string) => option(code)?.label ?? code
  const { config } = state
  const level = data.levels.find((l) => l.code === config.level) ?? data.levels[0]!
  const build = data.builds.find((b) => b.slug === level.build) ?? null
  const price = priceFromSnapshot(config, data.prices)
  const sell = (list: Record<string, number>, code: string) => {
    const value = lookupPrice(list, code)
    return value === undefined ? '—' : zl(value)
  }

  const lines: SummaryLine[] = [
    {
      key: 'level',
      label: 'Poziom mocy',
      value: `${level.cpu} + ${level.gpu}`,
      price: sell(data.prices.level, level.code),
    },
    {
      key: 'board',
      label: 'Płyta i zasilacz',
      value: `${level.mobo}, ${level.psu}`,
      price: 'w poziomie',
    },
    {
      key: 'case',
      label: 'Obudowa',
      value: optionLabel(config.case),
      price: sell(data.prices.option, config.case),
    },
    {
      key: 'cooler',
      label: 'Chłodzenie',
      value: optionLabel(config.cooler),
      price: sell(data.prices.option, config.cooler),
    },
    {
      key: 'ram',
      label: 'Pamięć',
      value: optionLabel(config.ram),
      price: sell(data.prices.option, config.ram),
    },
    {
      key: 'ssd',
      label: 'Dysk',
      value: optionLabel(config.ssd),
      price: sell(data.prices.option, config.ssd),
    },
    {
      key: 'service',
      label: 'Usługa',
      value: 'Windows 11, montaż, test, wysyłka',
      price: zl(data.prices.service),
    },
  ]

  const games = new Map(data.games.map((g) => [g.slug, g]))
  const fps: FpsShown[] = shownGames(state.games).flatMap((slug) => {
    const game = games.get(slug)
    if (!game) return []
    const cell = fpsCell(data.fps, level.build, slug, state.monitor)
    return [{ slug, name: game.name, cell, bar: cell ? barOf(cell.fps) : 0 }]
  })

  const ram = option(config.ram)
  const ssd = option(config.ssd)
  const memory =
    ram?.type === 'ram' && ssd?.type === 'ssd'
      ? `${capacityText(ram.capacityGb)} · ${capacityText(ssd.capacityGb)}`
      : ''

  const light = LIGHTS.find((l) => l.key === state.light)
  return {
    level,
    build,
    option,
    optionLabel,
    price,
    lines,
    fps,
    fpsNote: fpsNote(
      fps.map((f) => f.cell),
      state.monitor,
    ),
    stepValues: {
      monitor: RESOLUTION_LABELS[state.monitor],
      poziom: build?.name ?? level.tierLabel,
      obudowa: optionLabel(config.case),
      chlodzenie: optionLabel(config.cooler),
      pamiec: memory,
      podsumowanie: zl(price),
    },
    lightColor: light ? `var(--light-${light.key})` : `var(--c-${level.build})`,
    lightLabel: light?.label ?? 'Istoty',
  }
}
