import { expect, test } from '@playwright/test'

/**
 * „Kontakt” (C2, runda v2 §6): three equal ways in, each with one action (the inquiry in gold),
 * the phone and the e-mail as big touch targets, the shop from the company data with a link to
 * directions, owners with the service phone, and the company data with the public registers.
 */

test('three ways in, each with one action; the inquiry is the gold one', async ({ page }) => {
  await page.goto('/kontakt')
  const cards = page.locator('.ct-channel')
  await expect(cards).toHaveCount(3)
  await expect(cards.locator('h2')).toHaveText(['Zapytanie o komputer', 'Telefon', 'E-mail'])
  await expect(cards.nth(0)).toHaveClass(/ct-channel--hl/)
  await expect(cards.nth(0).getByRole('link', { name: 'Wypełnij formularz' })).toHaveAttribute(
    'href',
    '/zapytanie',
  )
  await expect(cards.nth(1).getByRole('link', { name: 'Zadzwoń' })).toHaveAttribute(
    'href',
    'tel:+48883200151',
  )
  await expect(cards.nth(2).getByRole('link', { name: 'Napisz' })).toHaveAttribute(
    'href',
    'mailto:kontakt@prokomgaming.pl',
  )
})

test('the phone number and the e-mail are links, at least 44 px tall', async ({ page }) => {
  await page.goto('/kontakt')
  for (const name of ['+48 883 200 151', 'kontakt@prokomgaming.pl']) {
    const link = page.locator('.ct-channel__big', { hasText: name })
    await expect(link).toHaveAttribute('href', /^(tel|mailto):/)
    const box = await link.boundingBox()
    expect(box!.height, name).toBeGreaterThanOrEqual(44)
  }
})

test('the shop, owners and the company data come from the company record', async ({ page }) => {
  await page.goto('/kontakt')
  await expect(page.locator('.ct-store__address')).toHaveText('ul. Orkana 16B, 34-700 Rabka-Zdrój')
  await expect(page.getByRole('link', { name: 'Prowadź do sklepu' })).toHaveAttribute(
    'href',
    /google\.com\/maps/,
  )
  await expect(page.getByRole('heading', { name: 'Pytanie, które nie jest wyceną?' })).toBeVisible()
  await expect(
    page.locator('.ct-owner').getByRole('link', { name: /Zadzwoń do serwisu/ }),
  ).toHaveAttribute('href', 'tel:+48883200151')
  const company = page.locator('.ct-firm')
  await expect(company).toContainText('PRO-KOM Tadeusz Wójciak')
  await expect(company).toContainText('735-251-14-47')
  await expect(company.getByRole('link', { name: 'Sprawdź w CEIDG' })).toHaveAttribute(
    'href',
    /ceidg\.gov\.pl/,
  )
  await expect(company.getByRole('link', { name: 'Sprawdź na białej liście VAT' })).toHaveAttribute(
    'href',
    /podatki\.gov\.pl/,
  )
})

test('no page-wide sideways scroll on a phone', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout')
  await page.goto('/kontakt')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(414)
})
