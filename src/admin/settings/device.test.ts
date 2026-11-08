import { describe, expect, it } from 'vitest'

import { deviceLabel, needsHomeScreen } from './device'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const WIN_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'

describe('deviceLabel', () => {
  it('platform and browser only', () => {
    expect(deviceLabel(IPHONE)).toBe('iPhone · Safari')
    expect(deviceLabel(ANDROID)).toBe('Android · Chrome')
    expect(deviceLabel(WIN_EDGE)).toBe('Windows · Edge')
    expect(deviceLabel('')).toBe('Urządzenie')
  })
})

describe('needsHomeScreen (ADR-G010: iOS 16.4+ from the home screen)', () => {
  it('only iPhone/iPad outside the home-screen app', () => {
    expect(needsHomeScreen(IPHONE, false)).toBe(true)
    expect(needsHomeScreen(IPHONE, true)).toBe(false)
    expect(needsHomeScreen(ANDROID, false)).toBe(false)
  })
})
