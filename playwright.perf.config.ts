import { defineConfig } from '@playwright/test'

import { DEFAULT_LOCALE } from './src/shared/domain/locale'
import { APP_TIME_ZONE } from './src/shared/domain/time'

// One worker so runs do not disturb each other; Chromium only (LCP, layout shifts and long tasks are in its API);
// no retries: the median of three runs absorbs noise.
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
    // CI reuses the e2e build; locally build first so a stale build is never measured
    command: isCI ? start : `npm run build && ${start}`,
    url: baseURL,
    env: { AUTH_REQUIRE_MFA: 'true' },
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
