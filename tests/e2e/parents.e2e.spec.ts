import { expect, test } from '@playwright/test'

import pricingExpected from '../fixtures/pricing-expected.json' with { type: 'json' }

/**
 * „Dla rodziców” from scratch (C1, runda v2 §5): seven parts in order, „Ile trzeba wydać?” with the
 * published prices, proof links to the public registers, buying in four steps, a glossary of six
 * words, the questions (FAQPage in JSON-LD) and the call that opens „Pomóżcie mi dobrać”.
 */

const price = (text: string) => Number(text.replace(/\D/g, ''))
const expected = new Map(pricingExpected.builds.map((b) => [b.slug, b.price]))

test('seven parts in the order of §5', async ({ page }) => {
  await page.goto('/dla-rodzicow')
  const ids = await page
    .locator('main [id]:is(header, section)')
    .evaluateAll((els) => els.map((e) => e.id))
  expect(ids).toEqual([
    'start',
    'pytania-rodzica',
    'dowody',
    'zakup',
    'slowniczek',
    'pytania',
    'napisz',
  ])
  await expect(page.locator('#zakup ol > li')).toHaveCount(4)
  await expect(page.locator('#slowniczek dt')).toHaveCount(6)
})

test('„Ile trzeba wydać?”: three bands at the published price of the cheapest fitting creatures', async ({
  page,
}) => {
  await page.goto('/dla-rodzicow')
  const bands = page.locator('.pr-bands li')
  await expect(bands).toHaveCount(3)
  const froms: number[] = []
  for (let i = 0; i < 3; i++) {
    const band = bands.nth(i)
    const from = price(await band.locator('.pr-bands__price').innerText())
    const first = band.locator('.pr-bands__picks a').first()
    const slug = (await first.getAttribute('href'))!.split('/').pop()!
    // Money: the amount is the published price of the first creature named (= fixtures).
    expect(from).toBe(expected.get(slug))
    froms.push(from)
  }
  expect([...froms].sort((a, b) => a - b)).toEqual(froms)
  await expect(page.locator('#pytania-rodzica')).toContainText('Ceny z montażem, Windows 11')
})

test('proof: registers, the shop and the certificate; the phone is a tel: link', async ({
  page,
}) => {
  await page.goto('/dla-rodzicow')
  const proof = page.locator('#dowody')
  await expect(proof.getByRole('link', { name: 'Sprawdź w CEIDG' })).toHaveAttribute(
    'href',
    /ceidg\.gov\.pl/,
  )
  await expect(proof.getByRole('link', { name: 'Sprawdź na białej liście VAT' })).toHaveAttribute(
    'href',
    /podatki\.gov\.pl/,
  )
  await expect(proof.getByRole('link', { name: 'Prowadź do sklepu' })).toHaveAttribute(
    'href',
    /google\.com\/maps\/dir/,
  )
  await expect(proof.getByRole('link', { name: 'Zobacz, co jest w metryce' })).toHaveAttribute(
    'href',
    '/#metryka',
  )
  await expect(page.locator('#start').getByRole('link', { name: /Zadzwoń/ })).toHaveAttribute(
    'href',
    'tel:+48883200151',
  )
})

test('structured data: BreadcrumbList and FAQPage with the questions of the page', async ({
  page,
}) => {
  await page.goto('/dla-rodzicow')
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((els) => els.map((e) => JSON.parse(e.textContent ?? '{}')))
  const types = blocks.flat().map((b: { '@type': string }) => b['@type'])
  expect(types).toContain('BreadcrumbList')
  const faq = blocks.flat().find((b: { '@type': string }) => b['@type'] === 'FAQPage')
  const questions = (faq.mainEntity as { name: string }[]).map((q) => q.name)
  expect(questions).toContain('Czy da się kupić na raty?')
  expect(questions).toHaveLength(await page.locator('#pytania details').count())
})

test('„Opisz, w co gra dziecko” opens the inquiry on „Pomóżcie mi dobrać”, for a child', async ({
  page,
}) => {
  await page.goto('/dla-rodzicow')
  const ask = page.locator('#start').getByRole('link', { name: 'Opisz, w co gra dziecko' })
  await expect(ask).toHaveAttribute('href', '/zapytanie?tryb=dobor&dla=dziecko')
  await ask.click()
  await expect(page).toHaveURL(/\/zapytanie\?tryb=dobor&dla=dziecko$/)
  await expect(page.getByRole('button', { name: 'Pomóżcie mi dobrać' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: 'Dla dziecka' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('no page-wide sideways scroll on a phone', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout')
  await page.goto('/dla-rodzicow')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(414)
})
