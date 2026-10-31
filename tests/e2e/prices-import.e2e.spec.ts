import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

/**
 * Cost import and margin alarm (ADR-G002 §4.1–§4.4) on the real database and the real Mailpit:
 * a bad row blocks saving, a cost that breaks the margin sends the alarm (prices stay), and an
 * import never publishes by itself — `autoPublish` is gone (P1, panel spec §0 pt 3). Every test
 * puts the seed costs and prices back.
 */

// Writes to the database: once, in the desktop project.
test.skip(({ isMobile }) => isMobile, 'imports in the desktop project only')

type Doc = { id: number; [key: string]: unknown }
type Level = Doc & {
  code: string
  components: { role: string; internalModel: string; cost: number }[]
}
type Option = Doc & { code: string; cost: number }
type Price = { itemType: string; itemCode: string; sellPrice: number; batch: number }

// Mailpit's web API: CI maps SMTP 1025 → UI 8025, local compose 1026 → 8026 (CLAUDE.md).
const MAILPIT =
  process.env.MAILPIT_URL ?? `http://127.0.0.1:${Number(process.env.SMTP_PORT ?? 1026) + 7000}`

let panel: APIRequestContext
let headers: { Authorization: string }
let p13: Level
let r16: Option

function credentials() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set.')
  return { email, password }
}

async function logIn(page: Page) {
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(credentials().email)
  await page.locator('#field-password').fill(credentials().password)
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/admin\/?$/)
  await page.goto('/admin/ceny')
}

async function findOne<T extends Doc>(collection: string, code: string): Promise<T> {
  const list = (await (
    await panel.get(`/api/${collection}?depth=0&where[code][equals]=${code}`, { headers })
  ).json()) as { docs: T[] }
  return list.docs[0]!
}

async function newestBatch(request: APIRequestContext): Promise<Price[]> {
  const top = (await (await request.get('/api/published-prices?sort=-batch&limit=1')).json()) as {
    docs: Price[]
  }
  const batch = top.docs[0]!.batch
  return (
    (await (
      await request.get(`/api/published-prices?limit=200&where[batch][equals]=${batch}`)
    ).json()) as { docs: Price[] }
  ).docs
}

async function importCsv(page: Page, text: string) {
  await page.getByLabel(/Wklej z arkusza albo pliku CSV/).fill(text)
  await page.getByRole('button', { name: 'Pokaż zmiany' }).click()
}

/** Save the previewed costs and wait until the refreshed screen has fully arrived. */
async function save(page: Page, outcome: RegExp) {
  await page.getByRole('button', { name: 'Zapisz koszty' }).click()
  await expect(page.getByText(outcome)).toBeVisible()
  await page.waitForLoadState('networkidle')
}

test.beforeAll(async ({ playwright, baseURL }) => {
  // Panel account in its own context: its cookie must not reach the anonymous `request` fixture.
  panel = await playwright.request.newContext({ baseURL })
  const login = await panel.post('/api/users/login', { data: credentials() })
  expect(login.status()).toBe(200)
  headers = { Authorization: `JWT ${((await login.json()) as { token: string }).token}` }
  p13 = await findOne<Level>('power-levels', 'P13')
  r16 = await findOne<Option>('options', 'R16')
})

test.afterAll(async () => {
  // Seed costs back — whatever happened above.
  await panel.patch(`/api/power-levels/${p13.id}`, {
    headers,
    data: { components: p13.components },
  })
  await panel.patch(`/api/options/${r16.id}`, { headers, data: { cost: r16.cost } })
  await panel.dispose()
})

test('a bad row blocks saving; the preview shows what would change', async ({ page }) => {
  await logIn(page)
  await importCsv(page, `kod;koszt\n${r16.code};${r16.cost + 1}\nNIE-MA-TAKIEGO;100\n${r16.code};5`)
  const live = page.locator('section[aria-labelledby="import"] [aria-live="polite"]')
  await expect(live).toContainText('1 zmian, 0 bez zmian, 2 błędnych wierszy.')
  await expect(live).toContainText(
    'Wiersz 3 („NIE-MA-TAKIEGO”): Nie znam tego kodu, EAN ani modelu części.',
  )
  await expect(live).toContainText('Wiersz 4 („R16;5”): Powtórzony kod (pierwszy raz w wierszu 2).')
  await expect(page.getByRole('button', { name: 'Zapisz koszty' })).toBeDisabled()
  expect((await findOne<Option>('options', 'R16')).cost).toBe(r16.cost)
})

test('a cost that breaks the margin sends the alarm; prices on the site stay', async ({
  page,
  request,
}) => {
  test.skip(!process.env.ALERT_EMAIL, 'ALERT_EMAIL not set locally — the alarm only logs')
  const before = await newestBatch(request)
  const gpu = p13.components.find((c) => c.role === 'gpu')!
  const startedAt = Date.now()

  await logIn(page)
  // By part model: P13 (Wampir) GPU +500 zł — its published price now breaks 11%.
  await importCsv(page, `${gpu.internalModel};${gpu.cost + 500}`)
  const table = page.getByRole('region', { name: 'Zmiany kosztów z importu' })
  await expect(table).toContainText('model części')
  await expect(table).toContainText('P13 — karta')
  await save(page, /Zapisano koszty: 0 opcji, \d+ poziomów mocy\. Marża sprawdzona/)
  await expect(
    page.getByText('Pilne: opublikowane ceny przy dzisiejszych kosztach łamią marżę.'),
  ).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Poziom mocy P13/ })).toBeChecked()

  // The alarm mail in Mailpit, sent right after the import.
  await expect
    .poll(
      async () => {
        const res = await request.get(
          `${MAILPIT}/api/v1/search?query=${encodeURIComponent('subject:PILNE')}`,
        )
        const body = (await res.json()) as {
          messages: { Subject: string; To: { Address: string }[]; Created: string; ID: string }[]
        }
        return body.messages.find(
          (m) =>
            Date.parse(m.Created) >= startedAt - 1000 &&
            m.To.some((t) => t.Address === process.env.ALERT_EMAIL),
        )?.Subject
      },
      { timeout: 15_000 },
    )
    .toContain('PILNE: marża poniżej 11,00%')

  // No automatic price change: the newest batch is the same.
  expect((await newestBatch(request))[0]!.batch).toBe(before[0]!.batch)
})

test('the Pulpit raises the broken margin: urgent to-do, alarm on top of the phone (P2)', async ({
  page,
}) => {
  const gpu = p13.components.find((c) => c.role === 'gpu')!
  // P13 (Wampir) GPU +500 zł — its published price now breaks the minimum (as above).
  const res = await panel.patch(`/api/power-levels/${p13.id}`, {
    headers,
    data: {
      components: p13.components.map((c) => (c === gpu ? { ...c, cost: c.cost + 500 } : c)),
    },
  })
  expect(res.status()).toBe(200)
  try {
    await logIn(page)
    await page.goto('/admin')
    const todo = page.getByRole('region', { name: 'Czeka na Ciebie' })
    await expect(
      todo.locator('b').getByText(/do zatwierdzenia · marża w konfiguratorze \d+(,\d)?%/),
    ).toBeVisible()
    await expect(todo.getByText(/^\d+ (pilne|pilnych)$/)).toBeVisible()
    // The tile of the lowest margin turns red.
    await expect(
      page.locator('.pn-kpi--bad').filter({ hasText: 'Najniższa marża w konfiguratorze' }),
    ).toBeVisible()
    // The alarm card is the phone's (spec §3, tel-01): hidden on a computer.
    const alarm = page.getByRole('alert').filter({ hasText: 'Marża poniżej 11%' })
    await expect(alarm).toBeHidden()

    await page.setViewportSize({ width: 414, height: 896 })
    await expect(alarm).toBeVisible()
    await expect(alarm).toContainText(/Najsłabsza konfiguracja: \d+(,\d)?%\./)
    await expect(
      alarm.getByRole('link', { name: /^Zatwierdź \d+ (cenę|ceny|cen)$/ }),
    ).toHaveAttribute('href', '/admin/ceny')
  } finally {
    await panel.patch(`/api/power-levels/${p13.id}`, {
      headers,
      data: { components: p13.components },
    })
  }
})

test('autoPublish cannot be switched on and an import never publishes by itself', async ({
  page,
  request,
}) => {
  await panel.patch(`/api/power-levels/${p13.id}`, {
    headers,
    data: { components: p13.components },
  })
  // The field is read-only for everyone: the API ignores the value.
  const tried = await panel.post('/api/globals/pricing-settings', {
    headers,
    data: { autoPublish: true },
  })
  expect(tried.status()).toBe(200)
  const settings = (await (
    await panel.get('/api/globals/pricing-settings', { headers })
  ).json()) as { autoPublish?: boolean | null }
  expect(settings.autoPublish).not.toBe(true)

  const before = await newestBatch(request)
  await logIn(page)
  // RAM 16 GB +10%: above the 3% threshold and within every margin — before P1 this published.
  await importCsv(page, `R16;${Math.round(r16.cost * 1.1)}`)
  await save(page, /Zapisano koszty: 1 opcji, 0 poziomów mocy/)
  expect((await newestBatch(request))[0]!.batch).toBe(before[0]!.batch)
  // The new price waits in the queue for approval instead.
  await expect(page.locator('section[aria-labelledby="queue"]')).toContainText('R16')

  await importCsv(page, `R16;${r16.cost}`)
  await save(page, /Zapisano koszty: 1 opcji/)
})
