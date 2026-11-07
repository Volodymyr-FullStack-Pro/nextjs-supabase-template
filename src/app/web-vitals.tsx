'use client'

import { useReportWebVitals } from 'next/web-vitals'
import { reportWebVital } from '@/shared/lib/web-vitals'

/** Подключается в корневом layout: собирает LCP, INP, CLS, FCP, TTFB реальных пользователей. */
export function WebVitals() {
  useReportWebVitals(reportWebVital)
  return null
}
