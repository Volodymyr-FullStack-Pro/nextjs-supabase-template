import { AFTER_SIGN_IN_PATH } from '@/shared/domain/routes'

export type Profile = 'desktop' | 'phone'

export type Budget = {
  serverResponseMs: number
  largestContentfulPaintMs: number
  totalBlockingTimeMs: number
  cumulativeLayoutShift: number
  lighthouseScore: number
  dataArrivedMs: number
}

export const BUDGET: Record<Profile, Budget> = {
  desktop: {
    serverResponseMs: 200,
    largestContentfulPaintMs: 1500,
    totalBlockingTimeMs: 200,
    cumulativeLayoutShift: 0.1,
    lighthouseScore: 0.9,
    dataArrivedMs: 500,
  },
  phone: {
    serverResponseMs: 200,
    largestContentfulPaintMs: 2500,
    totalBlockingTimeMs: 400,
    cumulativeLayoutShift: 0.1,
    lighthouseScore: 0.9,
    dataArrivedMs: 500,
  },
}

export const SEEDED_ROWS_PER_TABLE = 50_000
const SEEDED_TEXT = 'Строка замера'

export type MeasuredPage = {
  path: string
  signedIn?: true
  seed?: { table: string; sqlByColumn: Record<string, string>; textOnScreen: string }
}

const SIGN_IN_STEP =
  'шаг входа: страницу открывает сессия посреди входа, до второго фактора, а замер идёт с сессией после входа; форма — из тех же компонентов, что /login'

export const NOT_MEASURED: Record<string, string> = {
  '/mfa/setup': SIGN_IN_STEP,
  '/mfa/verify': SIGN_IN_STEP,
}

export const MEASURED_PAGES: MeasuredPage[] = [
  { path: '/' },
  { path: '/login' },
  {
    path: AFTER_SIGN_IN_PATH,
    signedIn: true,
    seed: {
      table: 'notes',
      sqlByColumn: {
        title: `'${SEEDED_TEXT} ' || n`,
        amount: 'n + 0.5',
        currency: `'EUR'`,
        client_request_id: 'gen_random_uuid()',
        created_at: `now() - n * interval '1 minute'`,
      },
      textOnScreen: SEEDED_TEXT,
    },
  },
]
