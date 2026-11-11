import {
  type Browser,
  type BrowserContextOptions,
  devices,
  expect,
  type Page,
} from '@playwright/test'

import type { MeasuredPage, Profile } from './pages'

type Throttling = {
  cpuSlowdown: number
  requestLatencyMs: number
  downloadKbps: number
  uploadKbps: number
}
type ScoreCurve = { scores90At: number; scores50At: number }
type Emulation = {
  device: BrowserContextOptions
  lighthouseDevtoolsThrottling: Throttling
  lighthouseScoreCurves: {
    firstContentfulPaintMs: ScoreCurve
    largestContentfulPaintMs: ScoreCurve
    totalBlockingTimeMs: ScoreCurve
    cumulativeLayoutShift: ScoreCurve
  }
}

const LAYOUT_SHIFT_CURVE: ScoreCurve = { scores90At: 0.1, scores50At: 0.25 }
const EMULATION: Record<Profile, Emulation> = {
  desktop: {
    device: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    lighthouseDevtoolsThrottling: {
      cpuSlowdown: 1,
      requestLatencyMs: 150,
      downloadKbps: 9216,
      uploadKbps: 9216,
    },
    lighthouseScoreCurves: {
      firstContentfulPaintMs: { scores90At: 934, scores50At: 1600 },
      largestContentfulPaintMs: { scores90At: 1200, scores50At: 2400 },
      totalBlockingTimeMs: { scores90At: 150, scores50At: 350 },
      cumulativeLayoutShift: LAYOUT_SHIFT_CURVE,
    },
  },
  phone: {
    device: devices['Pixel 7'],
    lighthouseDevtoolsThrottling: {
      cpuSlowdown: 4,
      requestLatencyMs: 562.5,
      downloadKbps: 1474.56,
      uploadKbps: 675,
    },
    lighthouseScoreCurves: {
      firstContentfulPaintMs: { scores90At: 1800, scores50At: 3000 },
      largestContentfulPaintMs: { scores90At: 2500, scores50At: 4000 },
      totalBlockingTimeMs: { scores90At: 200, scores50At: 600 },
      cumulativeLayoutShift: LAYOUT_SHIFT_CURVE,
    },
  },
}
const LIGHTHOUSE_SCORE_WEIGHTS = {
  firstContentfulPaintMs: 10,
  largestContentfulPaintMs: 25,
  totalBlockingTimeMs: 30,
  cumulativeLayoutShift: 25,
}

export const RUNS_PER_PAGE = 3
const BYTES_PER_SECOND_IN_KBPS = 1024 / 8
const HTTP_OK = 200
const LIGHTHOUSE_INTERACTIVE_QUIET_WINDOW_MS = 5000
const LONG_TASK_MS = 50
const DATA_ARRIVED_MARK = 'perf:data-arrived'

export type Metrics = {
  serverResponseMs: number
  firstContentfulPaintMs: number
  largestContentfulPaintMs: number
  totalBlockingTimeMs: number
  cumulativeLayoutShift: number
  dataArrivedMs?: number
}
export type PageSpeed = Metrics & { lighthouseScore: number }

function markWhenDataArrives({ text, mark }: { text: string; mark: string }) {
  const textInMarkup = `//body//text()[contains(., "${text}")][not(ancestor::*[self::script or self::style or self::template])]`
  const observer = new MutationObserver(() => {
    const arrived = document.evaluate(
      `boolean(${textInMarkup})`,
      document,
      null,
      XPathResult.BOOLEAN_TYPE,
    )
    if (!arrived.booleanValue) return
    performance.mark(mark)
    observer.disconnect()
  })
  observer.observe(document, { childList: true, subtree: true, characterData: true })
}

type ServerTimings = { requestToFirstByteMs: number; dataArrivedMs: number | null }

function readServerTimings(dataMark: string): ServerTimings {
  const [navigation] = performance.getEntriesByType('navigation')
  return {
    requestToFirstByteMs:
      navigation instanceof PerformanceNavigationTiming
        ? navigation.responseStart - navigation.requestStart
        : Infinity,
    dataArrivedMs: performance.getEntriesByName(dataMark)[0]?.startTime ?? null,
  }
}

type RenderTimings = {
  firstContentfulPaintMs: number
  largestContentfulPaintMs: number
  layoutShifts: number[]
  longTasks: { endMs: number; durationMs: number }[]
}

async function readRenderTimingsAfterQuietWindow(quiet: {
  forMs: number
  pollMs: number
}): Promise<RenderTimings> {
  const paints: PerformanceEntry[] = []
  const shifts: PerformanceEntry[] = []
  const tasks: PerformanceEntry[] = []
  const requests: PerformanceEntry[] = []
  const collect = (type: string, entries: PerformanceEntry[]) => {
    new PerformanceObserver((list) => {
      entries.push(...list.getEntries())
    }).observe({ type, buffered: true })
  }
  collect('largest-contentful-paint', paints)
  collect('layout-shift', shifts)
  collect('longtask', tasks)
  collect('resource', requests)

  const startedAt = performance.now()
  const endOf = (entry: PerformanceEntry) => entry.startTime + entry.duration
  await new Promise<void>((resolve) => {
    const check = () => {
      const busyUntil = Math.max(startedAt, ...[...tasks, ...requests].map((entry) => endOf(entry)))
      if (performance.now() - busyUntil >= quiet.forMs) resolve()
      else setTimeout(check, quiet.pollMs)
    }
    check()
  })

  return {
    firstContentfulPaintMs:
      performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0,
    largestContentfulPaintMs: paints.at(-1)?.startTime ?? 0,
    layoutShifts: shifts
      .map((shift) => shift.toJSON() as { value: number; hadRecentInput: boolean })
      .filter((shift) => !shift.hadRecentInput)
      .map((shift) => shift.value),
    longTasks: tasks.map((task) => ({ endMs: endOf(task), durationMs: task.duration })),
  }
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

export type Visit = {
  baseURL: string
  storageState?: Exclude<BrowserContextOptions['storageState'], undefined>
}
type Subject = { browser: Browser; target: MeasuredPage; profile: Profile; visit: Visit }

async function open(page: Page, target: MeasuredPage) {
  const response = await page.goto(target.path, { waitUntil: 'commit' })
  expect(response?.status(), `${target.path} не открылась`).toBe(HTTP_OK)
  expect(
    new URL(page.url()).pathname,
    `${target.path} увела на другой адрес — замерена была бы не она; странице за входом нужен signedIn в tests/perf/pages.ts`,
  ).toBe(target.path)
}

async function serverTimingsWithoutThrottling({ browser, target, profile, visit }: Subject) {
  const context = await browser.newContext({ ...EMULATION[profile].device, ...visit })
  try {
    const page = await context.newPage()
    if (target.seed) {
      await page.addInitScript(markWhenDataArrives, {
        text: target.seed.textOnScreen,
        mark: DATA_ARRIVED_MARK,
      })
    }
    await open(page, target)
    if (target.seed) {
      await page.waitForFunction(
        (mark) => performance.getEntriesByName(mark).length > 0,
        DATA_ARRIVED_MARK,
      )
    }
    return await page.evaluate(readServerTimings, DATA_ARRIVED_MARK)
  } finally {
    await context.close()
  }
}

async function renderTimingsUnderThrottling({ browser, target, profile, visit }: Subject) {
  const { device, lighthouseDevtoolsThrottling: throttling } = EMULATION[profile]
  const context = await browser.newContext({ ...device, ...visit })
  try {
    const page = await context.newPage()
    const devtools = await context.newCDPSession(page)
    await devtools.send('Network.enable')
    await devtools.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: throttling.requestLatencyMs,
      downloadThroughput: throttling.downloadKbps * BYTES_PER_SECOND_IN_KBPS,
      uploadThroughput: throttling.uploadKbps * BYTES_PER_SECOND_IN_KBPS,
    })
    await devtools.send('Emulation.setCPUThrottlingRate', { rate: throttling.cpuSlowdown })
    await open(page, target)
    await page.getByRole('heading', { level: 1 }).waitFor()
    if (target.seed) await page.getByText(target.seed.textOnScreen).first().waitFor()
    await page.waitForLoadState('load')
    return await page.evaluate(readRenderTimingsAfterQuietWindow, {
      forMs: LIGHTHOUSE_INTERACTIVE_QUIET_WINDOW_MS,
      pollMs: LONG_TASK_MS,
    })
  } finally {
    await context.close()
  }
}

async function measureOnce(subject: Subject): Promise<Metrics> {
  const server = await serverTimingsWithoutThrottling(subject)
  const render = await renderTimingsUnderThrottling(subject)
  const blockingAfterFirstPaint = render.longTasks
    .filter((task) => task.endMs > render.firstContentfulPaintMs)
    .map((task) => task.durationMs - LONG_TASK_MS)
  return {
    serverResponseMs: server.requestToFirstByteMs,
    firstContentfulPaintMs: render.firstContentfulPaintMs,
    largestContentfulPaintMs: render.largestContentfulPaintMs,
    totalBlockingTimeMs: sum(blockingAfterFirstPaint),
    cumulativeLayoutShift: sum(render.layoutShifts),
    ...(server.dataArrivedMs === null ? {} : { dataArrivedMs: server.dataArrivedMs }),
  }
}

async function measureInTurn(runsLeft: number, once: () => Promise<Metrics>): Promise<Metrics[]> {
  if (runsLeft === 0) return []
  const sample = await once()
  return [sample, ...(await measureInTurn(runsLeft - 1, once))]
}

const median = (values: number[]) =>
  values.toSorted((left, right) => left - right)[Math.floor(values.length / 2)] ?? 0

const INVERSE_ERFC_ONE_FIFTH = 0.906_193_802_436_823_2
const ERF_APPROXIMATION = {
  scale: 0.327_591_1,
  coefficients: [1.061_405_429, -1.453_152_027, 1.421_413_741, -0.284_496_736, 0.254_829_592],
}

function errorFunction(value: number): number {
  const reduced = 1 / (1 + ERF_APPROXIMATION.scale * Math.abs(value))
  const polynomial = ERF_APPROXIMATION.coefficients.reduce(
    (accumulated, coefficient) => (accumulated + coefficient) * reduced,
    0,
  )
  return Math.sign(value) * (1 - polynomial * Math.exp(-value * value))
}

function lighthouseMetricScore({ scores90At, scores50At }: ScoreCurve, value: number): number {
  if (value <= 0) return 1
  const distanceFromMedian = Math.log(value / scores50At) / -Math.log(scores90At / scores50At)
  return (1 - errorFunction(distanceFromMedian * INVERSE_ERFC_ONE_FIFTH)) / 2
}

function lighthouseScore(metrics: Metrics, profile: Profile): number {
  const curves = EMULATION[profile].lighthouseScoreCurves
  const names = Object.keys(LIGHTHOUSE_SCORE_WEIGHTS) as (keyof typeof LIGHTHOUSE_SCORE_WEIGHTS)[]
  const weighted = names.map(
    (name) => LIGHTHOUSE_SCORE_WEIGHTS[name] * lighthouseMetricScore(curves[name], metrics[name]),
  )
  return sum(weighted) / sum(Object.values(LIGHTHOUSE_SCORE_WEIGHTS))
}

const LAYOUT_SHIFT_PRECISION = 1000
const SCORE_PRECISION = 100

export async function measureMedian(subject: Subject): Promise<PageSpeed> {
  const samples = await measureInTurn(RUNS_PER_PAGE, () => measureOnce(subject))
  const medianOf = (pick: (sample: Metrics) => number) =>
    median(samples.map((sample) => pick(sample)))
  const metrics: Metrics = {
    serverResponseMs: Math.round(medianOf((sample) => sample.serverResponseMs)),
    firstContentfulPaintMs: Math.round(medianOf((sample) => sample.firstContentfulPaintMs)),
    largestContentfulPaintMs: Math.round(medianOf((sample) => sample.largestContentfulPaintMs)),
    totalBlockingTimeMs: Math.round(medianOf((sample) => sample.totalBlockingTimeMs)),
    cumulativeLayoutShift:
      Math.round(medianOf((sample) => sample.cumulativeLayoutShift) * LAYOUT_SHIFT_PRECISION) /
      LAYOUT_SHIFT_PRECISION,
    ...(subject.target.seed
      ? { dataArrivedMs: Math.round(medianOf((sample) => sample.dataArrivedMs ?? Infinity)) }
      : {}),
  }
  return {
    ...metrics,
    lighthouseScore:
      Math.floor(lighthouseScore(metrics, subject.profile) * SCORE_PRECISION) / SCORE_PRECISION,
  }
}
