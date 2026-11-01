import { defineConfig, devices } from '@playwright/test'

// Tests that log in use the seed admin (SEED_ADMIN_*). CI sets the variables itself; locally
// they come from `.env`, read by Node's built-in loader.
try {
  process.loadEnvFile()
} catch {
  // No `.env` (CI) — the variables are already in the environment.
}

// `PORT` from `.env`, default 3100 (prokom-web uses 3000/3001, ADR-G001 §4). Set back on the
// environment, so `pnpm dev` started below and the tests use the same one.
const port = Number(process.env.PORT ?? 3100)
process.env.PORT = String(port)

// Tests that change costs, publish price batches or try to break the offer (and put it back):
// they run first, one at a time, and every other test starts after them — so a test reading
// prices never sees a half-changed price list.
const DB_WRITERS =
  /(prices-panel|prices-import|offer-integrity|panel-settings|panel-inquiries|panel-push|panel-builds|panel-options|price-reports)\.e2e\.spec\.ts$/

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // CI: files in parallel on 3 workers (4-core runner, one `next start`); tests inside a file stay
  // in order (`fullyParallel` off). Locally 1: `next dev` compiles every route on first visit and
  // under parallel load slow pages miss the timeout — locally only the changed area runs anyway.
  workers: process.env.CI ? 3 : 1,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  // The two reference widths of the design (docs/design/prokomgaming/screens/*-1440, *-414).
  projects: [
    {
      // One login of the seed admin before everything (tests/e2e/auth.setup.ts): parallel logins
      // of the same account drop each other's Payload session.
      name: 'auth',
      testMatch: /auth\.setup\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'db-writers',
      testMatch: DB_WRITERS,
      dependencies: ['auth'],
      workers: 1,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // Phone (414): the prices screen read-only (publishing skips), the inquiry reply path and
      // switching push on (P4).
      name: 'db-writers-414',
      testMatch:
        /(prices-panel|panel-inquiries|panel-push|panel-builds|panel-options|price-reports)\.e2e\.spec\.ts$/,
      workers: 1,
      dependencies: ['db-writers'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 414, height: 896 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop-1440',
      testIgnore: DB_WRITERS,
      dependencies: ['db-writers'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-414',
      testIgnore: DB_WRITERS,
      dependencies: ['db-writers'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 414, height: 896 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    // CI (`E2E_SERVER=start`) tests the production build made just before — several times
    // faster than `next dev` compiling every route on first visit. Locally `pnpm dev` stays.
    command: process.env.E2E_SERVER === 'start' ? 'pnpm start' : 'pnpm dev',
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
