import { defineConfig } from '@playwright/test'

import { DEFAULT_LOCALE } from './src/shared/domain/locale'
import { APP_TIME_ZONE } from './src/shared/domain/time'

// Замер скорости (npm run perf): страницы и пороги — tests/perf/pages.ts. Отдельно от e2e: один поток, чтобы
// прогоны не мешали друг другу; только Chromium (LCP, сдвиги разметки и долгие задачи есть в его API);
// без повторов — шум гасит медиана трёх прогонов, а не повтор упавшего теста.
const PORT = 3100
const baseURL = `http://localhost:${String(PORT)}`
const isCI = Boolean(process.env['CI'])
const start = `npm run start -- -p ${String(PORT)}`

export default defineConfig({
  testDir: './tests/perf',
  workers: 1,
  forbidOnly: isCI,
  timeout: 180_000,
  reporter: [[isCI ? 'github' : 'list'], ['./tests/perf/table-reporter.ts']],
  use: { baseURL, locale: DEFAULT_LOCALE, timezoneId: APP_TIME_ZONE },
  webServer: {
    // В CI сборка уже сделана шагом e2e; локально собираем сами — замер не идёт по устаревшей сборке.
    command: isCI ? start : `npm run build && ${start}`,
    url: baseURL,
    env: { AUTH_REQUIRE_MFA: 'true' }, // как в production: второй фактор обязателен
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
