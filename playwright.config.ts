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

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  // The two reference widths of the design (docs/design/prokomgaming/screens/*-1440, *-414).
  projects: [
    {
      name: 'desktop-1440',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-414',
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
