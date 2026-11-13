import { defineConfig, devices } from '@playwright/test'

import { DEFAULT_LOCALE } from './src/shared/domain/locale'
import { APP_TIME_ZONE } from './src/shared/domain/time'

// own port, so a dev server on 3000 is never tested instead of the production build
const E2E_PORT = 3100
const MFA_REQUIRED_PORT = 3101
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? `http://localhost:${String(E2E_PORT)}`
const isCI = Boolean(process.env['CI'])
const hasDatabase = Boolean(process.env['SUPABASE_SECRET_KEY'])
// npm run gate has just built the app in npm run check, run under scripts/with-local-supabase.mjs:
// NEXT_PUBLIC_* values are inlined at build time, so the build must see the local Supabase ones
const isPrebuilt = process.env['E2E_PREBUILT'] === '1'
const start = `npm run start -- -p ${String(E2E_PORT)}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  failOnFlakyTests: isCI,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: DEFAULT_LOCALE,
    timezoneId: APP_TIME_ZONE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /\.setup\.ts$/ },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 15'] },
      testIgnore: /build\.spec\.ts/, // build checks do not depend on the device
      dependencies: ['setup'],
    },
  ],
  // servers start in order: the second one starts after the first has built the app
  webServer: [
    {
      command: isPrebuilt ? start : `npm run build && ${start}`,
      url: baseURL,
      // the server below checks the second factor; here it is off even if .env.local turns it on
      env: { AUTH_REQUIRE_MFA: 'false' },
      reuseExistingServer: !isCI,
      timeout: 180_000,
    },
    ...(hasDatabase
      ? [
          {
            command: `npm run start -- -p ${String(MFA_REQUIRED_PORT)}`,
            url: `http://localhost:${String(MFA_REQUIRED_PORT)}`,
            env: { AUTH_REQUIRE_MFA: 'true' },
            reuseExistingServer: !isCI,
            timeout: 60_000,
          },
        ]
      : []),
  ],
})
