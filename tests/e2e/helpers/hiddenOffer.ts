import { expect, type PlaywrightWorkerArgs } from '@playwright/test'

type Playwright = PlaywrightWorkerArgs['playwright']

/**
 * Internal models of power-level parts, RAM and SSD, read with the seed admin (cases and coolers
 * are shown by full name on purpose, ADR-G002 §8.7). Own request context: the login cookie must
 * not reach the page request of the test.
 */
export async function panelInternalModels(playwright: Playwright, baseURL: string | undefined) {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are not set.')
  const panel = await playwright.request.newContext({ baseURL })
  const login = await panel.post('/api/users/login', { data: { email, password } })
  const headers = { Authorization: `JWT ${((await login.json()) as { token: string }).token}` }
  type Docs = { docs: Record<string, unknown>[] }
  const levels = (await (
    await panel.get('/api/power-levels?limit=100&depth=0', { headers })
  ).json()) as Docs
  const options = (await (
    await panel.get('/api/options?limit=100&depth=0', { headers })
  ).json()) as Docs
  await panel.dispose()

  const models = [
    ...levels.docs.flatMap((d) =>
      (d.components as { internalModel: string }[]).map((c) => c.internalModel),
    ),
    ...options.docs
      .filter((d) => d.type === 'ram' || d.type === 'ssd')
      .map((d) => d.internalModel as string),
  ]
  expect(models).toHaveLength(16 * 4 + 7 + 4)
  return models
}

/** The page HTML (with its RSC data) has no internal model and no panel-only key. */
export function expectNoHiddenOffer(html: string, internalModels: readonly string[]) {
  for (const model of internalModels) expect(html, model).not.toContain(model)
  for (const key of [
    'cost',
    'costAtPublish',
    'internalModel',
    'markupClass',
    'internalRef',
    // P6: cost source and part key (a slug of the internal model).
    'costSource',
    'costNote',
    'costUpdatedAt',
    'partKey',
  ]) {
    expect(html, key).not.toContain(`"${key}"`)
  }
}
