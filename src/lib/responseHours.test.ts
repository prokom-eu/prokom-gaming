import { describe, expect, it } from 'vitest'

import { RESPONSE_HOURS, responseHours } from './responseHours'

describe('responseHours', () => {
  it.each([
    ['zwykle w godzinę, codziennie 8–22', 'codziennie 8–22'],
    ['Codziennie 9-21', 'codziennie 9–21'],
    ['w ciągu godziny, codziennie 7 – 23.', 'codziennie 7–23'],
  ])('takes the hours from „%s”', (text, hours) => {
    expect(responseHours(text)).toBe(hours)
  })

  it.each([null, undefined, '', 'w ciągu godziny', 'w dni robocze 8–16'])(
    'falls back to the constant for %j',
    (text) => {
      expect(responseHours(text)).toBe(RESPONSE_HOURS)
    },
  )
})
