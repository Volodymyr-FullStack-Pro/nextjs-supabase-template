'use client'

import { useReportWebVitals } from 'next/web-vitals'

const METRICS = new Set(['CLS', 'FCP', 'INP', 'LCP', 'TTFB'])
const RATINGS = new Set(['good', 'needs-improvement', 'poor'])

/** Next типизирует метрику как any; описываем то, что реально присылает web-vitals. */
type ReportedMetric = { id: string; name: string; value: number; rating?: string }

/**
 * Собирает Web Vitals реальных пользователей: в dev — в консоль, в проде — beacon на /api/vitals.
 * Без zod на клиенте (это +30 КБ на каждый маршрут): проверка схемой — на сервере.
 */
export function WebVitals() {
  useReportWebVitals((metric: ReportedMetric) => {
    if (!METRICS.has(metric.name) || !metric.rating || !RATINGS.has(metric.rating)) return // служебные метрики Next.js не шлём
    const body = {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      path: window.location.pathname,
    }
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[web-vitals]', body.name, body.value.toFixed(0), body.rating)
      return
    }
    navigator.sendBeacon('/api/vitals', JSON.stringify(body))
  })
  return null
}
