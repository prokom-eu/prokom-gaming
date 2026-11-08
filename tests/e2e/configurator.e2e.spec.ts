import { expect, test, type Page } from '@playwright/test'

import optionsSeed from '../../seed/prokomgaming/options.json' with { type: 'json' }
import levelsSeed from '../../seed/prokomgaming/power-levels.json' with { type: 'json' }
import { compatMessage, type CompatError } from '../../src/lib/compat'
import type { CompatLevel } from '../../src/lib/pricing/types'
import pricingExpected from '../fixtures/pricing-expected.json' with { type: 'json' }
import { expectNoHiddenOffer, panelInternalModels } from './helpers/hiddenOffer'

/**
 * Configurator (G10 PR 2, spec. §7, ADR-G002 §5–§6, boards Konfigurator / -telefon, `stany/konf-*`,
 * `tel-07`, `tel-08`): Wampir from its card → RAM change → the published price; the scenarios of
 * the pricing sheet in the UI (greyed-out options with the ADR reason); the warning; a level change
 * with its message; the address and the stored configuration; the phone bar; no hidden offer data.
 */

const price = (text: string | null) => Number((text ?? '').replace(/\D/g, ''))
const wampir = pricingExpected.builds.find((b) => b.slug === 'wampir')!
const k = (c: { level: string; case: string; cooler: string; ram: string; ssd: string }) =>
  [c.level, c.case, c.cooler, c.ram, c.ssd].join('.')

/** The price the visitor sees: the preview (desktop) or the bar above the tab bar (phone). */
const shownPrice = async (page: Page, isMobile: boolean) =>
  price(await page.locator(isMobile ? '.cf-mbar b' : '.cf-sb__p > b').textContent())

/** The slot whose option a rule greys out (ADR-G002 §5). */
const SLOT_OF: Record<CompatError, 'case' | 'cooler' | 'ram' | 'ssd'> = {
  gpu_too_long: 'case',
  case_class_too_low: 'case',
  cooler_too_tall: 'cooler',
  no_aio_mount: 'cooler',
  requires_aio: 'cooler',
  cooler_class_too_low: 'cooler',
  ram_type: 'ram',
  ram_too_small: 'ram',
  ssd_too_small: 'ssd',
}
const STEP_OF = { case: 'obudowa', cooler: 'chlodzenie', ram: 'pamiec', ssd: 'pamiec' } as const
const levelOf = (code: string) =>
  levelsSeed.items.find((l) => l.code === code) as unknown as CompatLevel

test('Wampir from its card: „Zmień części” → 64 GB → the published price and the link', async ({
  page,
  isMobile,
}) => {
  await page.goto('/zestawy/wampir')
  await page.getByRole('link', { name: 'Zmień części' }).click()
  // `next dev` compiles the route on the first visit.
  await expect(page).toHaveURL(/\/konfigurator\?/, { timeout: 30_000 })
  await expect(page.getByRole('heading', { level: 2, name: 'Poziom mocy' })).toBeVisible()
  expect(await shownPrice(page, isMobile)).toBe(wampir.price)

  await page.getByRole('button', { name: /Pamięć i dysk/ }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Pamięć i dysk' })).toBeFocused()
  await page.getByRole('button', { name: /^64 GB/ }).click()
  // Money: 64 GB is +3 190 zł on the board and in the pricing sheet.
  await expect.poll(() => shownPrice(page, isMobile)).toBe(wampir.price + 3190)
  await expect(page).toHaveURL(/k=P13\.LB500\.PL3LX\.R64\.NM1/)

  await page
    .getByRole('button', { name: /Podsumowanie/ })
    .first()
    .click()
  await expect(page.getByText('Twoja konfiguracja na bazie: Wampir')).toBeVisible()
  await expect(
    page.locator('.cf-fin').getByRole('link', { name: 'Zapytaj o tę konfigurację' }),
  ).toHaveAttribute('href', '/zapytanie?k=P13.LB500.PL3LX.R64.NM1')
})

test.describe('the pricing sheet in the UI (desktop)', () => {
  test.skip(({ isMobile }) => isMobile, 'the same rules on both widths')

  for (const s of pricingExpected.scenarios) {
    const errors = s.errors as CompatError[]
    // A RAM of the other memory type is not listed at all (the heading names the type).
    if (errors.length === 0 || errors[0] === 'ram_type') continue

    test(`greyed out with the reason: ${s.name}`, async ({ page }) => {
      const slot = SLOT_OF[errors[0]!]
      const code = s.config[slot]
      await page.goto(`/konfigurator?k=${k(s.config)}&krok=${STEP_OF[slot]}`)
      // The broken address is repaired, and the visitor is told what changed.
      await expect(page.locator('.cf-toast-live')).toContainText('Zachowaliśmy Twoje wybory.')
      const option = optionsSeed.items.find((o) => o.code === code)!
      if (slot === 'cooler' && option.kind === 'air') {
        await page.getByRole('button', { name: 'Powietrzne' }).click()
      }
      const card = page.locator(`button[aria-describedby="cf-why-${code}"]`)
      await expect(card).toHaveAttribute('aria-disabled', 'true')
      const reason = errors.filter((e) => SLOT_OF[e] === slot)[0]!
      await expect(page.locator(`#cf-why-${code}`)).toHaveText(
        compatMessage(reason, levelOf(s.config.level)),
      )
      // A greyed-out option cannot be chosen.
      await card.click({ force: true })
      await expect(card).toHaveAttribute('aria-pressed', 'false')
    })
  }

  test('the warning of Bazyliszek with Arctic in Light Base', async ({ page }) => {
    const s = pricingExpected.scenarios.find((x) => x.name.startsWith('Bazyliszek'))!
    await page.goto(`/konfigurator?k=${k(s.config)}&krok=chlodzenie`)
    await expect(page.locator('.cf-fine')).toHaveText(
      'Gruba chłodnica na górze — sprawdzimy prześwit nad pamięcią',
    )
    expect(await shownPrice(page, false)).toBe(s.price)
  })

  test('valid configurations of the sheet: price and ready-build recognition', async ({ page }) => {
    for (const s of pricingExpected.scenarios.filter((x) => x.errors.length === 0)) {
      await page.goto(`/konfigurator?k=${k(s.config)}&krok=podsumowanie`)
      await expect(page.locator('.cf-match'), s.name).toContainText(
        s.matchesBuild ? 'nasz gotowy zestaw' : 'Twoja konfiguracja na bazie',
      )
      expect(await shownPrice(page, false), s.name).toBe(s.price)
    }
  })

  test('Licho (AM4) with DDR5: RAM of the right type, the visitor is told', async ({ page }) => {
    const s = pricingExpected.scenarios.find((x) => x.errors[0] === 'ram_type')!
    await page.goto(`/konfigurator?k=${k(s.config)}&krok=pamiec`)
    await expect(page.locator('.cf-toast-live')).toContainText('RAM → 32 GB DDR4')
    await expect(page.getByRole('heading', { level: 3, name: 'Pamięć RAM DDR4' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^32 GB/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

test('a level change keeps the choice and says what changed', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the same logic on both widths')
  const bies = pricingExpected.builds.find((b) => b.slug === 'bies')!.config
  await page.goto(`/konfigurator?k=${k({ ...bies, ssd: 'NM2' })}&krok=poziom`)
  await page
    .locator('.cf-tier')
    .filter({ hasText: 'monitor 4K' })
    .getByRole('button', { name: 'GeForce' })
    .click()
  await expect(page.locator('.cf-toast-live')).toContainText(
    'Zachowaliśmy Twoje wybory. 4K wymaga zmian, więc dopasowaliśmy:',
  )
  await expect(page.locator('.cf-toast-live')).toContainText('RAM → 32 GB DDR5 6000 CL30 RGB biała')
  // ADR-G002 §6 example: 16 → 32 GB, the cheapest DDR5 32 GB (R32WP).
  await expect(page).toHaveURL(new RegExp(`k=P13\\.${bies.case}\\.${bies.cooler}\\.R32WP\\.NM2`))
})

test('the address is a link to the state; without one the last configuration returns', async ({
  page,
}) => {
  const custom = k({ ...wampir.config, ram: 'R64', ssd: 'NM2' })
  await page.goto(`/konfigurator?k=${custom}&krok=pamiec&swiatlo=lod&monitor=4k`)
  await expect(page.getByRole('button', { name: /^64 GB/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: /^2 TB/ })).toHaveAttribute('aria-pressed', 'true')

  await page.goto('/konfigurator')
  // The stored state comes back through the address: one more server render.
  await expect(page).toHaveURL(new RegExp(`k=${custom.replace(/\./g, '\\.')}`), {
    timeout: 15_000,
  })
  await expect(page).toHaveURL(/swiatlo=lod/)
  await expect(page).toHaveURL(/monitor=4k/)
  await expect(page.getByRole('heading', { level: 2, name: 'Pamięć i dysk' })).toBeVisible()
})

test('a stored start configuration does not freeze the address (review G10)', async ({ page }) => {
  // First visit stores the start; the second visit without parameters finds the same state.
  await page.goto('/konfigurator')
  await expect(page).toHaveURL(/k=P13\./)
  await page.goto('/zestawy')
  await page.goto('/konfigurator')
  await expect(page).toHaveURL(/k=P13\./, { timeout: 15_000 })
  await page.getByRole('button', { name: /^4K/ }).click()
  await expect(page).toHaveURL(/monitor=4k/)
  expect(await page.evaluate(() => localStorage.getItem('pkg:config'))).toContain('monitor=4k')
})

test('the summary passes the light and the other part to the inquiry', async ({ page }) => {
  await page.goto(`/konfigurator?zestaw=wampir&krok=podsumowanie`)
  await expect(page.getByText('To dokładnie Wampir, nasz gotowy zestaw')).toBeVisible()
  await page.locator('.cf-step').getByRole('button', { name: 'Lód' }).click()
  await page
    .getByLabel('Chcesz obudowę albo chłodzenie, których nie ma na liście?')
    .fill('Lian Li O11')
  await expect(
    page.locator('.cf-fin').getByRole('link', { name: 'Zapytaj o tę konfigurację' }),
  ).toHaveAttribute('href', `/zapytanie?k=${k(wampir.config)}&swiatlo=lod&inne=Lian+Li+O11`)
})

test.describe('phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone layout (≤ 760 px)')

  test('the price bar sits above the tab bar; no step scrolls sideways', async ({ page }) => {
    for (const step of ['monitor', 'poziom', 'obudowa', 'chlodzenie', 'pamiec', 'podsumowanie']) {
      await page.goto(`/konfigurator?zestaw=wampir&krok=${step}`)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, step).toBe(0)
    }
    await page.goto('/konfigurator?zestaw=wampir&krok=obudowa')
    await expect(page.locator('.cf-side')).toBeHidden()
    const bar = page.locator('.cf-mbar')
    await expect(bar.getByRole('button', { name: 'Dalej: Chłodzenie' })).toBeVisible()
    const tabbar = await page.locator('.tabbar').boundingBox()
    await expect
      .poll(async () => {
        const box = await bar.boundingBox()
        return box && tabbar ? Math.round(box.y + box.height - tabbar.y) : 999
      })
      .toBe(0)
  })
})

test('the page carries no cost or internal model', async ({ page, playwright, baseURL }) => {
  const internalModels = await panelInternalModels(playwright, baseURL)
  for (const step of ['poziom', 'podsumowanie']) {
    const response = await page.goto(`/konfigurator?zestaw=wampir&krok=${step}`)
    expect(response?.status()).toBe(200)
    expectNoHiddenOffer(await response!.text(), internalModels)
  }
})
