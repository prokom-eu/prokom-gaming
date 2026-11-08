import type Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it } from 'vitest'

import { fetchedAtOf, readPrompt } from './claude'

const item = {
  publicLabel: 'Endorfy Signum 300 ARGB',
  internalModel: 'Endorfy Signum 300 ARGB',
  ean: null,
  previousCost: 249,
}

describe('readPrompt', () => {
  it('puts the address on its own line as plain text (the fetch tool refused it inside JSON)', () => {
    const url = 'https://www.x-kom.pl/p/1078067-obudowa-do-komputera-endorfy-signum-300-argb.html'
    const prompt = readPrompt(url, item)
    expect(prompt.split('\n')[0]).toBe(`Adres oferty: ${url}`)
    expect(prompt).not.toContain(`"${url}"`)
    expect(prompt).toContain('"internalModel":"Endorfy Signum 300 ARGB"')
  })
})

describe('fetchedAtOf', () => {
  it('reads the date of the fetched page copy', () => {
    const content = [
      { type: 'server_tool_use', id: 's1', name: 'web_fetch', input: {} },
      {
        type: 'web_fetch_tool_result',
        tool_use_id: 's1',
        content: {
          type: 'web_fetch_result',
          url: 'https://www.x-kom.pl/p/1',
          retrieved_at: '2026-10-22T00:23:51+00:00',
          content: {},
        },
      },
    ] as unknown as Anthropic.ContentBlock[]
    expect(fetchedAtOf(content)).toBe('2026-10-22T00:23:51+00:00')
  })

  it('no page (a fetch error) = null', () => {
    const content = [
      {
        type: 'web_fetch_tool_result',
        tool_use_id: 's1',
        content: { type: 'web_fetch_tool_result_error', error_code: 'url_not_in_prior_context' },
      },
    ] as unknown as Anthropic.ContentBlock[]
    expect(fetchedAtOf(content)).toBeNull()
  })
})
