import { readdirSync } from 'node:fs'
import { dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { MEASURED_PAGES, NOT_MEASURED } from '../../perf/pages'

const APP_DIRECTORY = fileURLToPath(new URL('../../../src/app', import.meta.url))
const PAGE_FILE = /(^|\/)page\.tsx$/u
const ROUTE_GROUP = /^\(.+\)$/u
const DYNAMIC_SEGMENT = /\[[^\]]+\]/gu

const routes = readdirSync(APP_DIRECTORY, { recursive: true, encoding: 'utf8' })
  .map((file) => file.split(sep).join('/'))
  .filter((file) => PAGE_FILE.test(file))
  .map((file) => {
    const segments = dirname(file)
      .split('/')
      .filter(
        (segment) => segment !== '.' && !ROUTE_GROUP.test(segment) && !segment.startsWith('@'),
      )
    return `/${segments.join('/')}`
  })
const matches = (route: string, path: string) =>
  new RegExp(`^${route.replaceAll(DYNAMIC_SEGMENT, '[^/]+')}$`, 'u').test(path)

describe('pages measured by npm run perf', () => {
  it('measures every page of src/app or names why it does not', () => {
    const forgotten = routes.filter(
      (route) =>
        !(route in NOT_MEASURED) && !MEASURED_PAGES.some(({ path }) => matches(route, path)),
    )
    expect(
      forgotten,
      'page without a measurement: add it to MEASURED_PAGES or give a reason in NOT_MEASURED (tests/perf/pages.ts)',
    ).toEqual([])
  })

  it('keeps no exclusion or measurement for a page that is gone', () => {
    const stale = [
      ...Object.keys(NOT_MEASURED).filter((route) => !routes.includes(route)),
      ...MEASURED_PAGES.map(({ path }) => path).filter(
        (path) => !routes.some((route) => matches(route, path)),
      ),
    ]
    expect(stale).toEqual([])
  })

  it('gives a reason for every page it does not measure', () => {
    expect(Object.values(NOT_MEASURED).filter((reason) => reason.trim() === '')).toEqual([])
  })
})
