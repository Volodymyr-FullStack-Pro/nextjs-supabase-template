import { type BrowserContextOptions, expect, test } from '@playwright/test'

import {
  createTestUser,
  deleteTestUser,
  enrollTotp,
  seedOwnedRows,
  submitLoginUntil,
  type TestUser,
} from '../e2e/support/users'
import { measureMedian, type PageSpeed, RUNS_PER_PAGE } from './measure'
import { BUDGET, type Budget, MEASURED_PAGES, type Profile, SEEDED_ROWS_PER_TABLE } from './pages'

const PROFILES: Profile[] = ['desktop', 'phone']
const SECOND_FACTOR_SETUP_URL = /\/mfa\/setup$/u
const SIGN_IN_STEP_TIMEOUT_MS = 5000

let user: TestUser
let session: Exclude<BrowserContextOptions['storageState'], string | undefined>

test.beforeAll(async ({ browser }) => {
  user = await createTestUser('perf')
  const page = await browser.newPage({ baseURL: test.info().project.use.baseURL ?? '' })
  await submitLoginUntil(page, user, () =>
    expect(page).toHaveURL(SECOND_FACTOR_SETUP_URL, { timeout: SIGN_IN_STEP_TIMEOUT_MS }),
  )
  await enrollTotp(page)
  session = await page.context().storageState()
  await page.close()
})

test.afterAll(async () => {
  await deleteTestUser(user)
})

const overBudget = (speed: PageSpeed, budget: Budget): string[] =>
  [
    speed.serverResponseMs > budget.serverResponseMs &&
      `TTFB ${String(speed.serverResponseMs)} ms > ${String(budget.serverResponseMs)}`,
    speed.largestContentfulPaintMs > budget.largestContentfulPaintMs &&
      `LCP ${String(speed.largestContentfulPaintMs)} ms > ${String(budget.largestContentfulPaintMs)}`,
    speed.totalBlockingTimeMs > budget.totalBlockingTimeMs &&
      `TBT ${String(speed.totalBlockingTimeMs)} ms > ${String(budget.totalBlockingTimeMs)}`,
    speed.cumulativeLayoutShift > budget.cumulativeLayoutShift &&
      `CLS ${String(speed.cumulativeLayoutShift)} > ${String(budget.cumulativeLayoutShift)}`,
    speed.lighthouseScore < budget.lighthouseScore &&
      `score ${String(speed.lighthouseScore)} < ${String(budget.lighthouseScore)}`,
    speed.dataArrivedMs !== undefined &&
      speed.dataArrivedMs > budget.dataArrivedMs &&
      `data arrived after ${String(speed.dataArrivedMs)} ms > ${String(budget.dataArrivedMs)}`,
  ].filter((line) => line !== false)

for (const target of MEASURED_PAGES) {
  test.describe(target.path, () => {
    test.beforeAll(async () => {
      if (target.seed) await seedOwnedRows(user, { ...target.seed, count: SEEDED_ROWS_PER_TABLE })
    })

    for (const profile of PROFILES) {
      test(`meets the performance budget on ${profile}`, async ({ browser, baseURL }, testInfo) => {
        const speed = await measureMedian({
          browser,
          target,
          profile,
          visit: { baseURL: baseURL ?? '', ...(target.signedIn ? { storageState: session } : {}) },
        })
        const budget = BUDGET[profile]
        await testInfo.attach('perf', {
          body: JSON.stringify({ path: target.path, profile, speed, budget }),
          contentType: 'application/json',
        })
        expect(
          overBudget(speed, budget),
          `${target.path}, ${profile}: median of ${String(RUNS_PER_PAGE)} runs is over the budget in tests/perf/pages.ts`,
        ).toEqual([])
      })
    }
  })
}
