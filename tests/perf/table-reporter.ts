import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter'

import type { PageSpeed } from './measure'
import type { Budget, Profile } from './pages'

type Row = { path: string; profile: Profile; speed: PageSpeed; budget: Budget }

const MS_IN_SECOND = 1000
const GAP = '  '
const HEADER = [
  'страница',
  'профиль',
  'TTFB, мс',
  'FCP, мс',
  'LCP, мс',
  'TBT, мс',
  'CLS',
  'оценка',
  'данные видны, мс',
]

const cell = (value: number | undefined, limit?: number) => {
  if (value === undefined) return '—'
  return limit === undefined ? String(value) : `${String(value)} (${String(limit)})`
}

const toCells = ({ path, profile, speed, budget }: Row) => [
  path,
  profile,
  cell(speed.serverResponseMs, budget.serverResponseMs),
  cell(speed.firstContentfulPaintMs),
  cell(speed.largestContentfulPaintMs, budget.largestContentfulPaintMs),
  cell(speed.totalBlockingTimeMs, budget.totalBlockingTimeMs),
  cell(speed.cumulativeLayoutShift, budget.cumulativeLayoutShift),
  cell(speed.lighthouseScore, budget.lighthouseScore),
  cell(speed.dataVisibleMs, budget.dataVisibleMs),
]

export default class TableReporter implements Reporter {
  private readonly rows: Row[] = []

  onTestEnd(_test: TestCase, result: TestResult) {
    for (const { name, body } of result.attachments) {
      if (name === 'perf' && body) this.rows.push(JSON.parse(body.toString()) as Row)
    }
  }

  onEnd(result: FullResult) {
    const lines = [HEADER, ...this.rows.map((row) => toCells(row))]
    const widths = HEADER.map((_, column) =>
      Math.max(...lines.map((line) => line[column]?.length ?? 0)),
    )
    console.log(
      '\nЗамер скорости: медиана трёх прогонов (в скобках — порог из tests/perf/pages.ts)',
    )
    for (const line of lines) {
      const padded = line.map((text, column) => text.padEnd(widths[column] ?? 0))
      console.log(padded.join(GAP).trimEnd())
    }
    console.log(`Всего: ${String(Math.round(result.duration / MS_IN_SECOND))} с`)
  }
}
