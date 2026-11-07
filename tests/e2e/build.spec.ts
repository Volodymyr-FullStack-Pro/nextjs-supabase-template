import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

const TTFB_LIMIT_MS = 1000

test('proxy is part of the production build', () => {
  const manifest = JSON.parse(
    readFileSync('.next/server/functions-config-manifest.json', 'utf8'),
  ) as { functions: Record<string, { matchers: { originalSource: string }[] }> }
  const proxy = manifest.functions['/_middleware']
  expect(proxy, 'src/proxy.ts не попал в сборку').toBeDefined()
  expect(proxy?.matchers[0]?.originalSource).toContain('_next/static')
})

test('serves the home page shell quickly', async ({ page }) => {
  await page.goto('/')
  const ttfb = await page.evaluate(
    () =>
      (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).responseStart,
  )
  expect(ttfb).toBeLessThan(TTFB_LIMIT_MS)
})
