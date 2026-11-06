import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3000'
const isCI = Boolean(process.env['CI'])

// E2E против production-сборки (next build && next start), как рекомендует Next.js.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
})
