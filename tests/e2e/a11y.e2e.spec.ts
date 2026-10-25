import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Every page passes axe (WCAG 2.1 A/AA) at 1440 and 414 (both Playwright projects).
// Each UI session adds its pages here. G1: home (temporary) and the panel login; G2: 404
// (the shell itself is on every page; the open menu is checked in shell.e2e.spec.ts).
const PAGES = [
  { path: '/', status: 200 },
  { path: '/admin/login', status: 200 },
  { path: '/nie-ma-takiej-strony', status: 404 },
]
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

test.describe('accessibility (axe)', () => {
  for (const { path, status } of PAGES) {
    test(path, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(status)
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
      // Rule ids and targets only, so a failure reads well in the CI log.
      expect(
        violations.map((v) => ({ rule: v.id, targets: v.nodes.map((n) => n.target) })),
      ).toEqual([])
    })
  }
})
