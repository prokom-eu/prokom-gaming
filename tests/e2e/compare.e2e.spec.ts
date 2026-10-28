import { expect, test } from '@playwright/test'

import pricingExpected from '../fixtures/pricing-expected.json' with { type: 'json' }
import { expectNoHiddenOffer, panelInternalModels } from './helpers/hiddenOffer'

/**
 * Porównywarka (G11, spec. §9, boards Porownywarka / Porownywarka-telefon, `stany/tel-13`): a sent
 * link opens exactly its view (builds, game, resolution, refresh rate, „Tylko różnice”), the
 * verdict and steps of the board, prices = fixtures, changes follow in the address and in the
 * header counter, a visit without builds returns to the saved ones, no cost or internal model.
 */

const BOARD = '/porownaj?z=baba-jaga,wampir,weles&gra=cyberpunk-2077&rozdz=2k&hz=144'
const price = (slug: string) => pricingExpected.builds.find((b) => b.slug === slug)!.price
const digits = (text: string | null) => Number((text ?? '').replace(/\D/g, ''))
const plain = (text: string | null) => (text ?? '').replace(/ /g, ' ')

test('a link opens its view: the board example', async ({ page }) => {
  await page.goto(BOARD)
  const slots = page.locator('.cmp-slot')
  await expect(slots.locator('.nm')).toHaveText(['Baba Jaga', 'Wampir', 'Weles'])
  // Prices from the published batch = fixtures (spec. §27 pt 1).
  const shown = await slots.locator('.cmp-slot__price b').allTextContents()
  expect(shown.map(digits)).toEqual(['baba-jaga', 'wampir', 'weles'].map(price))
  await expect(page.getByRole('combobox', { name: 'Gra' })).toHaveValue('cyberpunk-2077')
  await expect(page.getByRole('radio', { name: '2K' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('radio', { name: '144 Hz' })).toHaveAttribute('aria-checked', 'true')

  const verdict = page.locator('.cmp-verdict')
  await expect(verdict.locator('h2')).toHaveText('Baba Jaga wystarczy')
  await expect(verdict).toContainText('Werdykt dla: Cyberpunk 2077, 2K, monitor 144 Hz')
  expect(plain(await verdict.locator('.cmp-verdict__more').textContent())).toBe(
    'Weles da o 36% więcej klatek, za dopłatę 5 450 zł. Warto, jeśli chcesz zapasu na kolejne premiery albo wyższą rozdzielczość.',
  )
  await expect(slots.nth(0).locator('.cmp-slot__badge')).toHaveText('Wystarczy')
  await expect(slots.nth(2).locator('.cmp-slot__badge')).toHaveText('Najwięcej klatek')
  // Every number has its source.
  for (const slot of await slots.all()) await expect(slot.locator('.src')).toHaveCount(1)

  const steps = (await page.locator('.cmp-steps li').allTextContents()).map(plain)
  expect(steps).toEqual([
    'Z Baby Jagi na Wampira+20% klatekza dopłatę 2 890 zł',
    'Z Wampira na Welesa+13% klatekza dopłatę 2 560 zł',
  ])
  await expect(page.locator('.cmp-table--matrix tbody tr')).toHaveCount(8)
})

test('changes follow in the address; the link reopens the same view', async ({ page }) => {
  await page.goto(BOARD)
  await page.getByRole('combobox', { name: 'Gra' }).selectOption('elden-ring')
  await page.getByRole('radio', { name: '4K' }).click()
  await page.getByRole('radio', { name: '240 Hz' }).click()
  await page.getByText('Tylko różnice').click()
  await page.getByRole('button', { name: 'Usuń Wampira z porównania' }).click()
  await expect(page).toHaveURL(/\?z=baba-jaga,weles&gra=elden-ring&rozdz=4k&hz=240&roznice=1$/)
  await expect(page.locator('.cmp-verdict h2')).toHaveText('Tu dopłata nic nie zmieni')
  // „Tylko różnice”: shared rows and the „W cenie każdego” group are gone.
  await expect(page.locator('.cmp-table--spec')).not.toContainText('Gwarancja')

  const link = page.url()
  await page.goto('/')
  await page.goto(link)
  await expect(page.locator('.cmp-slot .nm')).toHaveText(['Baba Jaga', 'Weles'])
  await expect(page.getByRole('combobox', { name: 'Gra' })).toHaveValue('elden-ring')
  await expect(page.getByText('Tylko różnice').locator('input')).toBeChecked()

  await page.getByRole('button', { name: 'Dodaj trzeci komputer' }).click()
  await expect(page.locator('.cmp-slot')).toHaveCount(3)
})

test('one build from a build page gets the next dearer one; the header counts them', async ({
  page,
}) => {
  await page.goto('/zestawy/wampir')
  // The button in the price block (the header has a „Porównaj” link too).
  await page.locator('a[href="/porownaj?z=wampir"]').first().click()
  await expect(page).toHaveURL(/\/porownaj\?z=wampir,/)
  await expect(page.locator('.cmp-slot')).toHaveCount(2)
  await expect(page.locator('.cmp-slot .nm').first()).toHaveText('Wampir')
  await expect(page.getByRole('link', { name: /Porównanie, 2/ }).first()).toBeVisible()
})

test('a visit without builds returns to the ones picked last time', async ({ page }) => {
  await page.goto('/porownaj?z=licho,perun')
  // Saved once the page has hydrated: the header counter shows it.
  await expect(page.getByRole('link', { name: /Porównanie, 2/ }).first()).toBeVisible()
  await page.goto('/porownaj')
  // A navigation to the saved address (as the configurator's return, G10): under `next dev` the
  // route compiles on the way, hence the longer wait.
  await expect(page).toHaveURL(/z=licho,perun/, { timeout: 20_000 })
  await expect(page.locator('.cmp-slot .nm')).toHaveText(['Licho', 'Perun'])
})

test('not enough power: the suggestion goes into the comparison', async ({ page }) => {
  await page.goto('/porownaj?z=skrzat,licho&gra=cyberpunk-2077&rozdz=4k&hz=60')
  await expect(page.locator('.cmp-verdict h2')).toHaveText('Za mało mocy na ten monitor')
  await page.getByRole('button', { name: /^Wstaw .+ do porównania$/ }).click()
  await expect(page.locator('.cmp-slot')).toHaveCount(3)
  await expect(page.locator('.cmp-verdict h2')).not.toHaveText('Za mało mocy na ten monitor')
})

test('share: mail with the link, inquiry about all of them', async ({ page }) => {
  await page.goto(BOARD)
  const mail = await page.getByRole('link', { name: 'Wyślij mailem' }).getAttribute('href')
  expect(decodeURIComponent(mail ?? '')).toContain(
    '/porownaj?z=baba-jaga,wampir,weles&gra=cyberpunk-2077&rozdz=2k&hz=144',
  )
  await expect(page.getByRole('link', { name: 'Zapytaj o wszystkie naraz' })).toHaveAttribute(
    'href',
    '/zapytanie?z=baba-jaga,wampir,weles',
  )
})

test('the page does not scroll sideways', async ({ page }) => {
  await page.goto(BOARD)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBe(0)
})

test('the page carries no cost or internal model', async ({ page, playwright, baseURL }) => {
  const internalModels = await panelInternalModels(playwright, baseURL)
  const response = await page.goto(BOARD)
  expect(response?.status()).toBe(200)
  expectNoHiddenOffer(await response!.text(), internalModels)
})
