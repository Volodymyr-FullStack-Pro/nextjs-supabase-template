import { defineConfig, devices } from '@playwright/test'

import { APP_LOCALE, APP_TIME_ZONE } from './src/shared/domain/time'

// Свой порт: локальный dev-сервер на 3000 не подменяет production-сборку
const E2E_PORT = 3100
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? `http://localhost:${String(E2E_PORT)}`
const isCI = Boolean(process.env['CI'])

// E2E против production-сборки (next build && next start), как рекомендует Next.js.
// Каждый сценарий проходит на компьютере (Chrome, 1440×900) и на iPhone (Safari, WebKit):
// так проверяются разметка на ширине телефона, касания и движок Safari, на котором сидят пользователи iOS.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  failOnFlakyTests: isCI, // тест, прошедший только с повтора, — красный, а не тихо зелёный
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    locale: APP_LOCALE,
    timezoneId: APP_TIME_ZONE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 15'] },
      testIgnore: /build\.spec\.ts/, // проверки сборки и TTFB не зависят от устройства
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${String(E2E_PORT)}`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
})
