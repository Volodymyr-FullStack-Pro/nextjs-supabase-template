import { defineConfig, devices } from '@playwright/test'

import { DEFAULT_LOCALE } from './src/shared/domain/locale'
import { APP_TIME_ZONE } from './src/shared/domain/time'

// Свой порт: локальный dev-сервер на 3000 не подменяет production-сборку
const E2E_PORT = 3100
// Та же сборка с обязательным вторым фактором (AUTH_REQUIRE_MFA=true) — для tests/e2e/mfa.spec.ts.
const MFA_REQUIRED_PORT = 3101
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? `http://localhost:${String(E2E_PORT)}`
const isCI = Boolean(process.env['CI'])
const hasDatabase = Boolean(process.env['SUPABASE_SECRET_KEY'])

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
    locale: DEFAULT_LOCALE,
    timezoneId: APP_TIME_ZONE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Вход тестовых пользователей (alice, bob) через admin API и форму входа → playwright/.auth/*.json.
    // Без локального Supabase (npm run test:e2e без :db) пропускается вместе со сценариями за входом.
    { name: 'setup', testMatch: /\.setup\.ts$/ },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      dependencies: ['setup'],
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 15'] },
      testIgnore: /build\.spec\.ts/, // проверки сборки и TTFB не зависят от устройства
      dependencies: ['setup'],
    },
  ],
  // Серверы запускаются по очереди: второй стартует, когда первый собрал проект.
  webServer: [
    {
      command: `npm run build && npm run start -- -p ${String(E2E_PORT)}`,
      url: baseURL,
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
