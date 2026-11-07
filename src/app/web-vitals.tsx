'use client'

import { useReportWebVitals } from 'next/web-vitals'

import { isProduction } from '@/shared/lib/runtime'

const METRICS = new Set(['CLS', 'FCP', 'INP', 'LCP', 'TTFB'])
const RATINGS = new Set(['good', 'needs-improvement', 'poor'])

type ReportedMetric = { id: string; name: string; value: number; rating?: string }

export function WebVitals() {
  useReportWebVitals((metric: ReportedMetric) => {
    if (!METRICS.has(metric.name) || !metric.rating || !RATINGS.has(metric.rating)) return
    const body = {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      path: window.location.pathname,
    }
    if (!isProduction) {
      console.debug('[web-vitals]', body.name, body.value.toFixed(0), body.rating)
      return
    }
    navigator.sendBeacon('/api/vitals', JSON.stringify(body))
  })
  return null
}
