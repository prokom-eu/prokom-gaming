import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Every page passes axe (WCAG 2.1 A/AA) at 1440 and 414 (both Playwright projects).
// Each UI session adds its pages here. G1: home (temporary) and the panel login; G2: 404
// (the shell itself is on every page; the open menu is checked in shell.e2e.spec.ts); G9: /zestawy, /zestawy/wampir;
// G10: the configurator — the level step and the case step (option cards greyed out with reasons).
const PAGES = [
  { path: '/', status: 200 },
  { path: '/zestawy', status: 200 },
  { path: '/zestawy/wampir', status: 200 },
  { path: '/konfigurator?zestaw=wampir&krok=monitor', status: 200 },
  { path: '/konfigurator?zestaw=wampir&krok=poziom', status: 200 },
  { path: '/konfigurator?zestaw=wampir&krok=obudowa', status: 200 },
  // Bazyliszek with Arctic in Light Base: the cooler step with its warning.
  { path: '/konfigurator?k=P10.LB500.ARC.R32.NM1&krok=chlodzenie', status: 200 },
  // Wampir with 16 GB: repaired, so the message is shown and 16 GB is greyed out.
  { path: '/konfigurator?k=P13.LB500.PL3LX.R16.NM1&krok=pamiec', status: 200 },
  { path: '/konfigurator?zestaw=wampir&krok=podsumowanie', status: 200 },
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
