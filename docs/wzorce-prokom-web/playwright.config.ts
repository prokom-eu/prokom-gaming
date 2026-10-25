import { defineConfig, devices } from '@playwright/test'

// Tests that edit content log in as the seed admin (SEED_ADMIN_*). CI sets the variables
// itself; locally they come from `.env`, read by Node's built-in loader.
try {
  process.loadEnvFile()
} catch {
  // No `.env` (CI) — the variables are already in the environment.
}

// Port of this working folder (`PORT` in `.env`, default 3000): two folders run side by side
// on 3000 and 3001 (docs/sposob-pracy.md). Set back on the environment, so `pnpm dev` started
// below and the test helpers use the same one.
const port = Number(process.env.PORT ?? 3000)
process.env.PORT = String(port)

// Chromium resolves *.localhost to the loopback address, no hosts file needed.
// `localhost` itself is not a tenant (404), so the panel is the default address.
const baseURL = `http://panel.localhost:${port}`

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // CI (`E2E_SERVER=start`) tests the production build made just before — several times
    // faster than `next dev` compiling every route on first visit. Locally `pnpm dev` stays.
    command: process.env.E2E_SERVER === 'start' ? 'pnpm start' : 'pnpm dev',
    // Waits for the port: Node.js does not resolve *.localhost on every system, and every
    // non-panel URL answers 404, which Playwright does not count as "ready".
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
