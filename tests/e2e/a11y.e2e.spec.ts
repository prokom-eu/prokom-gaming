import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Every page passes axe (WCAG 2.1 A/AA) at 1440 and 414 (both Playwright projects).
// G1: the temporary home page and the panel login. Each UI session adds its pages here.
const PATHS = ['/', '/admin/login']
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

test.describe('accessibility (axe)', () => {
  for (const path of PATHS) {
    test(path, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
      // Rule ids and targets only, so a failure reads well in the CI log.
      expect(
        violations.map((v) => ({ rule: v.id, targets: v.nodes.map((n) => n.target) })),
      ).toEqual([])
    })
  }
})
