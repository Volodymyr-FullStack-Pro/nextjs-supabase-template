import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { describe, expect, it, vi } from 'vitest'

import { config } from '@/proxy'

await vi.hoisted(async () => {
  const { AsyncLocalStorage } = await import('node:async_hooks')
  vi.stubGlobal('AsyncLocalStorage', AsyncLocalStorage)
})
vi.mock('server-only', () => ({}))

const THROUGH_PROXY = [
  '/',
  '/login',
  '/notes',
  '/mfa/setup',
  '/api/export/2026.csv',
  '/api/documents/42/scan.png',
  '/api/reports/chart.svg',
  '/documents/42/receipt.jpg',
  '/documents/42/receipt.jpeg',
  '/documents/scan.PNG',
  '/documents/scan.pdf',
  '/faviconXico/secret',
  '/favicon.ico/secret',
  '/logo.png/',
  '/logo.png/secret',
  '/.png',
  '/statement.pdf',
  '/export.csv',
  '/robots.txt',
  '/_next',
  '/_next/static',
  '/_next/staticX',
  '/_next/static-export/data',
  '/_next/imageXY',
  '/_next/image/secret',
  '/_next/data/build-id/notes.json',
  '/notes.rsc',
  '/documents/42/receipt.jpg.rsc',
]

const PAST_PROXY = [
  '/favicon.ico',
  '/next.svg',
  '/logo.png',
  '/photo.jpg',
  '/photo.jpeg',
  '/spinner.gif',
  '/cover.webp',
  '/_next/static/chunks/main.js',
  '/_next/static/css/app.css',
  '/_next/static/media/font.woff2',
  '/_next/image',
  '/_next/image/',
  '/_next/image?url=%2Fnext.svg&w=64&q=75',
]

const runsProxy = (url: string) => unstable_doesMiddlewareMatch({ config, url })

describe('proxy matcher', () => {
  it.each(THROUGH_PROXY)('runs the proxy for %s', (url) => {
    expect(runsProxy(url)).toBe(true)
  })

  it.each(PAST_PROXY)('serves the static file %s without the proxy', (url) => {
    expect(runsProxy(url)).toBe(false)
  })
})
