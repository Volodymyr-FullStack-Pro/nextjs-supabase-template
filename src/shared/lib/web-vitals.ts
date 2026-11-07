import { z } from 'zod'

const MAX_ID_LENGTH = 100
const MAX_PATH_LENGTH = 500
const METRICS = ['CLS', 'FCP', 'INP', 'LCP', 'TTFB'] as const
const RATINGS = ['good', 'needs-improvement', 'poor'] as const

export const WebVitalSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  name: z.enum(METRICS),
  value: z.number().min(0),
  rating: z.enum(RATINGS),
  path: z.string().max(MAX_PATH_LENGTH),
})
