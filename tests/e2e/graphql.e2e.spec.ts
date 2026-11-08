import { expect, test } from '@playwright/test'

// GraphQL is disabled (payload.config.ts): the only public API is REST, whose field access the
// cost / internalModel tests check (ADR-G002 §8.7). Guards against it coming back unnoticed.
test('there is no GraphQL endpoint', async ({ request }) => {
  const response = await request.post('/api/graphql', { data: { query: '{ __typename }' } })
  expect(response.status()).toBe(404)
  expect((await request.get('/api/graphql-playground')).status()).toBe(404)
})
