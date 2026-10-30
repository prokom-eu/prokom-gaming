import { expect, test } from '@playwright/test'

/**
 * Certificate `/metryka/<kod>` (G14, spec. §13): the seed unit's results, parts and warranty;
 * unknown or unpublished codes are a 404; the code form normalises what people type; never the
 * customer's e-mail; never indexed. Seed: seed/prokomgaming/workshop.json.
 */

const PUBLISHED = 'WMPR-7KQ2-M9XA-B3CD'
const UNPUBLISHED = 'B7ES-2DRF-8NWT-QK4M'

test('a published certificate shows this unit and nothing about the customer', async ({ page }) => {
  const response = await page.goto(`/metryka/${PUBLISHED}`)
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Wampir, egzemplarz nr \d+$/)
  await expect(page.getByRole('heading', { name: 'Test obciążeniowy' })).toBeVisible()
  await expect(page.getByText('bez błędów').first()).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Klatki zmierzone na tym egzemplarzu' }),
  ).toBeVisible()
  await expect(page.locator('.mt-fps li')).toHaveCount(3)
  await expect(page.getByText('Karta graficzna RTX 5070 Ti 16 GB').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pobierz metrykę w PDF' })).toBeVisible()
  // The order of this unit is being tested: the timeline says so.
  await expect(page.locator('.tl li[aria-current="step"]')).toHaveText('Test i pomiary')

  const html = await response!.text()
  expect(html).not.toContain('jan@example.test')
  expect(html).not.toContain('@example.test')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})

test('unknown, unpublished and malformed codes are a 404', async ({ request }) => {
  for (const code of [UNPUBLISHED, '2222-2222-2222-2222', 'nie-kod', '%27%20OR%201%3D1']) {
    expect((await request.get(`/metryka/${code}`)).status(), code).toBe(404)
  }
})

test('the code form takes the code as people type it', async ({ page }) => {
  await page.goto('/metryka')
  await page.getByLabel('Wpisz kod z naklejki').fill(PUBLISHED.toLowerCase().replaceAll('-', ' '))
  await page.getByRole('button', { name: 'Pokaż metrykę' }).click()
  await expect(page).toHaveURL(new RegExp(`/metryka/${PUBLISHED}$`))

  await page.goto('/metryka?kod=abc')
  await expect(page.getByRole('alert')).toContainText('To nie wygląda na kod z naklejki')
})
