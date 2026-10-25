import { expect, test } from '@playwright/test'

// The deploy waits for this endpoint (Dockerfile HEALTHCHECK); it must never be cached.
test('GET /api/health answers 200 without caching and without data', async ({ request }) => {
  const response = await request.get('/api/health')
  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('no-store')
  expect(await response.json()).toEqual({ status: 'ok' })
})
