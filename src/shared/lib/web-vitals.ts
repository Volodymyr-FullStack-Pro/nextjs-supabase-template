import { z } from 'zod'

const MAX_ID_LENGTH = 100
const MAX_PATH_LENGTH = 500

/** Метрика реального пользователя (RUM): что браузер измерил на странице. */
export const WebVitalSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  name: z.enum(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']),
  value: z.number().min(0),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  path: z.string().max(MAX_PATH_LENGTH),
})
/**
 * Отправка Web Vitals из браузера: в dev — в консоль, в проде — beacon на /api/vitals
 * (оттуда — в лог, Sentry или аналитику). Lighthouse в CI — лабораторная проверка, это — полевая.
 */
export function reportWebVital(metric: {
  id: string
  name: string
  value: number
  rating?: string
}) {
  const parsed = WebVitalSchema.safeParse({ ...metric, path: window.location.pathname })
  if (!parsed.success) return // служебные метрики Next.js (hydration и т. п.) не отправляем
  if (process.env.NODE_ENV !== 'production') {
    console.debug(
      '[web-vitals]',
      parsed.data.name,
      parsed.data.value.toFixed(0),
      parsed.data.rating,
    )
    return
  }
  navigator.sendBeacon('/api/vitals', JSON.stringify(parsed.data))
}
