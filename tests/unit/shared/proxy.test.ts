import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MFA_PATHS } from '@/shared/domain/mfa'
import { proxy } from '@/proxy'

import {
  AAL1_UNCONFIRMED_FACTOR,
  AAL1_WITH_FACTOR,
  AAL1_WITHOUT_FACTOR,
  AAL2,
  AUTH_OUTAGE,
  type AuthState,
  NO_STORE,
  REJECTED_TOKEN,
  REVOKED_SESSION,
  type SetAllCookies,
  setAuthState,
  SIGNED_OUT,
} from '../support/supabase-auth'

type ClientOptions = { cookies: { setAll: SetAllCookies } }

const ORIGIN = 'http://localhost:3100'
const SESSION_COOKIE = 'sb-test-auth-token'
const REFRESHED = { name: SESSION_COOKIE, value: 'refreshed', options: { path: '/' } }

const reportUnexpectedError = vi.hoisted(() => vi.fn())

vi.mock('server-only', () => ({}))
vi.mock('@/shared/infrastructure/monitoring', () => ({ reportUnexpectedError }))
vi.mock('@supabase/ssr', async () => {
  const { fakeSupabase } = await import('../support/supabase-auth')
  return {
    createServerClient: (_url: string, _key: string, options: ClientOptions) =>
      fakeSupabase(options.cookies.setAll),
  }
})

const PROTECTED = {
  page: '/reports/2026',
  api: '/api/reports/2026',
  setup: MFA_PATHS.setup,
  verify: MFA_PATHS.verify,
} as const
const PUBLIC = ['/', '/login', '/api/vitals', '/api/cron/daily', '/api/webhooks/bank']

type Expected = Record<keyof typeof PROTECTED, string>
const UNAUTHORIZED = '401 {"error":"unauthorized"}'
const MFA_REQUIRED = '403 {"error":"mfa_required"}'
const PASS = 'pass'
const TO_LOGIN: Expected = {
  page: 'redirect /login',
  api: UNAUTHORIZED,
  setup: 'redirect /login',
  verify: 'redirect /login',
}
const TO_VERIFY: Expected = {
  page: 'redirect /mfa/verify',
  api: MFA_REQUIRED,
  setup: 'redirect /mfa/verify',
  verify: PASS,
}
const TO_SETUP: Expected = {
  page: 'redirect /mfa/setup',
  api: MFA_REQUIRED,
  setup: PASS,
  verify: 'redirect /mfa/setup',
}
const OPEN: Expected = { page: PASS, api: PASS, setup: PASS, verify: PASS }

const REQUIRED = 'true'
const OPTIONAL = 'false'
const SESSIONS: [name: string, state: AuthState, requireMfa: string, expected: Expected][] = [
  ['no session', SIGNED_OUT, OPTIONAL, TO_LOGIN],
  ['no session', SIGNED_OUT, REQUIRED, TO_LOGIN],
  ['a token Supabase Auth rejects', REJECTED_TOKEN, OPTIONAL, TO_LOGIN],
  ['a revoked aal1 session', REVOKED_SESSION, OPTIONAL, TO_LOGIN],
  ['an aal1 session during an Auth outage', AUTH_OUTAGE, OPTIONAL, TO_LOGIN],
  ['aal1 with a verified factor', AAL1_WITH_FACTOR, OPTIONAL, TO_VERIFY],
  ['aal1 with a verified factor', AAL1_WITH_FACTOR, REQUIRED, TO_VERIFY],
  ['aal1 without a factor', AAL1_WITHOUT_FACTOR, REQUIRED, TO_SETUP],
  ['aal1 with an unconfirmed factor', AAL1_UNCONFIRMED_FACTOR, REQUIRED, TO_SETUP],
  ['aal1 without a factor', AAL1_WITHOUT_FACTOR, OPTIONAL, OPEN],
  ['aal1 with an unconfirmed factor', AAL1_UNCONFIRMED_FACTOR, OPTIONAL, OPEN],
  ['aal2', AAL2, OPTIONAL, OPEN],
  ['aal2', AAL2, REQUIRED, OPEN],
]
const PROTECTED_CASES = SESSIONS.flatMap(([session, state, requireMfa, expected]) =>
  Object.entries(PROTECTED).map(([kind, path]) => ({
    session,
    state,
    requireMfa,
    path,
    expected: expected[kind as keyof Expected],
  })),
)
const PUBLIC_CASES = SESSIONS.flatMap(([session, state, requireMfa]) =>
  PUBLIC.map((path) => ({ session, state, requireMfa, path })),
)

async function outcomeOf(response: Response): Promise<string> {
  if (response.headers.get('x-middleware-next') === '1') return PASS
  const location = response.headers.get('location')
  if (location) return `redirect ${new URL(location).pathname}`
  return `${String(response.status)} ${await response.text()}`
}

function visit(path: string) {
  return proxy(new NextRequest(`${ORIGIN}${path}`))
}

describe('proxy', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'publishable-key')
    vi.stubEnv('AUTH_REQUIRE_MFA', OPTIONAL)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    reportUnexpectedError.mockClear()
    setAuthState(undefined)
  })

  it.each(PROTECTED_CASES)(
    '$session, AUTH_REQUIRE_MFA=$requireMfa: $path → $expected',
    async ({ state, requireMfa, path, expected }) => {
      vi.stubEnv('AUTH_REQUIRE_MFA', requireMfa)
      setAuthState(state)

      await expect(outcomeOf(await visit(path))).resolves.toBe(expected)
    },
  )

  it.each(PUBLIC_CASES)(
    '$session, AUTH_REQUIRE_MFA=$requireMfa: public $path is served',
    async ({ state, requireMfa, path }) => {
      vi.stubEnv('AUTH_REQUIRE_MFA', requireMfa)
      setAuthState(state)

      await expect(outcomeOf(await visit(path))).resolves.toBe(PASS)
    },
  )

  it('does not treat a path that merely starts like a public one as public', async () => {
    setAuthState(SIGNED_OUT)

    await expect(outcomeOf(await visit('/login/reports'))).resolves.toBe('redirect /login')
    await expect(outcomeOf(await visit('/api/cron'))).resolves.toBe(UNAUTHORIZED)
    await expect(outcomeOf(await visit('/api/vitals/raw'))).resolves.toBe(UNAUTHORIZED)
  })

  it('reports an Auth outage but not a revoked session', async () => {
    setAuthState(REVOKED_SESSION)
    await visit(PROTECTED.page)
    expect(reportUnexpectedError).not.toHaveBeenCalled()

    setAuthState(AUTH_OUTAGE)
    await visit(PROTECTED.page)
    expect(reportUnexpectedError).toHaveBeenCalledWith('auth.listFactors', AUTH_OUTAGE.factorsError)
  })

  it.each([
    ['a page it serves', AAL2, PROTECTED.page, PASS],
    [
      'a redirect to the second-factor step',
      AAL1_WITH_FACTOR,
      PROTECTED.page,
      'redirect /mfa/verify',
    ],
    ['a JSON refusal of an API call', AAL1_WITH_FACTOR, PROTECTED.api, MFA_REQUIRED],
  ])(
    'keeps the refreshed session cookie and the no-store headers on %s',
    async (_name, state, path, expected) => {
      setAuthState({ ...state, refreshedCookie: REFRESHED })

      const response = await visit(path)

      expect(response.cookies.get(SESSION_COOKIE)?.value).toBe('refreshed')
      expect(response.headers.get('cache-control')).toBe(NO_STORE)
      await expect(outcomeOf(response)).resolves.toBe(expected)
    },
  )

  it('hands the refreshed session cookie to the page it serves', async () => {
    setAuthState({ ...AAL2, refreshedCookie: REFRESHED })

    const response = await visit(PROTECTED.page)

    expect(response.headers.get('x-middleware-request-cookie')).toBe(`${SESSION_COOKIE}=refreshed`)
  })

  it('answers 503 on everything but public paths when Supabase is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    setAuthState(AAL2)

    await expect(outcomeOf(await visit(PROTECTED.page))).resolves.toBe('503 Сервис не настроен')
    await expect(outcomeOf(await visit(PROTECTED.api))).resolves.toBe('503 Сервис не настроен')
    await expect(outcomeOf(await visit('/login'))).resolves.toBe(PASS)
  })
})
