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
const MAIN_THREAD_QUIET_MS = 500
const LONG_TASK_MS = 50
const DATA_VISIBLE_MARK = 'perf:data-visible'

export type Metrics = {
  serverResponseMs: number
  firstContentfulPaintMs: number
  largestContentfulPaintMs: number
  totalBlockingTimeMs: number
  cumulativeLayoutShift: number
  dataVisibleMs?: number
}
export type PageSpeed = Metrics & { lighthouseScore: number }

function markWhenTextLeavesHiddenStream({ text, mark }: { text: string; mark: string }) {
  const observer = new MutationObserver((records) => {
    const isOnScreen = records
      .flatMap((record) => [...record.addedNodes])
      .some(
        (node) =>
          node.textContent?.includes(text) === true &&
          (node instanceof Element ? node : node.parentElement)?.closest('[hidden]') === null,
      )
    if (!isOnScreen) return
    performance.mark(mark)
    observer.disconnect()
  })
  observer.observe(document, { childList: true, subtree: true })
}

type ServerTimings = { requestToFirstByteMs: number; dataVisibleMs: number | null }

async function readServerTimingsAfterFirstPaint(dataMark: string): Promise<ServerTimings> {
  const firstPaintMs = await new Promise<number>((resolve) => {
    new PerformanceObserver((list, observer) => {
      const [paint] = list.getEntriesByName('first-contentful-paint')
      if (!paint) return
      observer.disconnect()
      resolve(paint.startTime)
    }).observe({ type: 'paint', buffered: true })
  })
  const [navigation] = performance.getEntriesByType('navigation')
  const [dataInDocument] = performance.getEntriesByName(dataMark)
  return {
    requestToFirstByteMs:
      navigation instanceof PerformanceNavigationTiming
        ? navigation.responseStart - navigation.requestStart
        : Number.NaN,
    dataVisibleMs: dataInDocument ? Math.max(dataInDocument.startTime, firstPaintMs) : null,
  }
}

type RenderTimings = {
  firstContentfulPaintMs: number
  largestContentfulPaintMs: number
  layoutShifts: number[]
  longTasks: { endMs: number; durationMs: number }[]
}

async function readRenderTimingsOnceMainThreadIsQuiet(quiet: {
  forMs: number
  pollMs: number
}): Promise<RenderTimings> {
  const paints: PerformanceEntry[] = []
  const shifts: PerformanceEntry[] = []
  const tasks: PerformanceEntry[] = []
  const collect = (type: string, entries: PerformanceEntry[]) => {
    new PerformanceObserver((list) => {
      entries.push(...list.getEntries())
    }).observe({ type, buffered: true })
  }
  collect('largest-contentful-paint', paints)
  collect('layout-shift', shifts)
  collect('longtask', tasks)

  const startedAt = performance.now()
  const endOf = (task: PerformanceEntry) => task.startTime + task.duration
  await new Promise<void>((resolve) => {
    const check = () => {
      const busyUntil = Math.max(startedAt, ...tasks.map((task) => endOf(task)))
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

async function openUntilContentIsOnScreen(page: Page, target: MeasuredPage) {
  const response = await page.goto(target.path, { waitUntil: 'commit' })
  expect(response?.status(), `${target.path} не открылась`).toBe(HTTP_OK)
  await page.getByRole('heading', { level: 1 }).waitFor()
  if (target.seed) await page.getByText(target.seed.textOnScreen).first().waitFor()
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
      await page.addInitScript(markWhenTextLeavesHiddenStream, {
        text: target.seed.textOnScreen,
        mark: DATA_VISIBLE_MARK,
      })
    }
    await openUntilContentIsOnScreen(page, target)
    return await page.evaluate(readServerTimingsAfterFirstPaint, DATA_VISIBLE_MARK)
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
    await openUntilContentIsOnScreen(page, target)
    await page.waitForLoadState('load')
    return await page.evaluate(readRenderTimingsOnceMainThreadIsQuiet, {
      forMs: MAIN_THREAD_QUIET_MS,
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
    ...(server.dataVisibleMs === null ? {} : { dataVisibleMs: server.dataVisibleMs }),
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
      ? { dataVisibleMs: Math.round(medianOf((sample) => sample.dataVisibleMs ?? Infinity)) }
      : {}),
  }
  return {
    ...metrics,
    lighthouseScore:
      Math.floor(lighthouseScore(metrics, subject.profile) * SCORE_PRECISION) / SCORE_PRECISION,
  }
}
