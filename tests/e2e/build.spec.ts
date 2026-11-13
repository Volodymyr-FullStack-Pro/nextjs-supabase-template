import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

const HTTP_OK = 200
const HTTP_REDIRECT = 307
const HTTP_UNAUTHORIZED = 401
const HTTP_NOT_CONFIGURED = 503
const NESTED_IMAGE_PATHS = [
  { path: '/api/documents/42/scan.png', refusals: [HTTP_UNAUTHORIZED, HTTP_NOT_CONFIGURED] },
  { path: '/documents/42/receipt.jpg', refusals: [HTTP_REDIRECT, HTTP_NOT_CONFIGURED] },
]

test('proxy is part of the production build', () => {
  const manifest = JSON.parse(
    readFileSync('.next/server/functions-config-manifest.json', 'utf8'),
  ) as { functions: Record<string, { matchers: { originalSource: string }[] }> }
  const proxy = manifest.functions['/_middleware']
  expect(proxy, 'src/proxy.ts is missing from the build').toBeDefined()
  expect(proxy?.matchers[0]?.originalSource).toContain('_next/static')
})

for (const { path, refusals } of NESTED_IMAGE_PATHS) {
  test(`refuses a signed-out request for ${path} in the proxy`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(refusals, 'answered not by proxy: a path ending like an image bypassed it').toContain(
      response.status(),
    )
  })
}

test('serves a top-level static file to a signed-out visitor', async ({ request }) => {
  const response = await request.get('/favicon.ico', { maxRedirects: 0 })
  expect(response.status()).toBe(HTTP_OK)
})
