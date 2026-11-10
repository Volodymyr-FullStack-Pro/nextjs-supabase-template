import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  requireVerifiedSession,
  type Session,
  sessionMfaStep,
  verifiedSessionOrResponse,
  verifySession,
} from '@/shared/lib/session'

import {
  AAL1_UNCONFIRMED_FACTOR,
  AAL1_WITH_FACTOR,
  AAL1_WITHOUT_FACTOR,
  AAL2,
  AUTH_OUTAGE,
  type AuthState,
  REJECTED_TOKEN,
  REVOKED_SESSION,
  setAuthState,
  SIGNED_OUT,
  USER_ID,
} from '../support/supabase-auth'

vi.mock('server-only', () => ({}))
vi.mock('@/shared/infrastructure/monitoring', () => ({ reportUnexpectedError: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`redirect ${path}`)
  },
}))
vi.mock('@/shared/infrastructure/supabase/server', async () => {
  const { fakeSupabase } = await import('../support/supabase-auth')
  return { createClient: () => Promise.resolve(fakeSupabase()) }
})

const REQUIRED = 'true'
const OPTIONAL = 'false'
const WITHOUT_SUB: AuthState = { ...AAL2, claims: { sub: '', aal: 'aal2' } }
const AAL1_SESSION: Session = { userId: USER_ID, aal: 'aal1', hasVerifiedFactor: false }
const AAL1_FACTOR_SESSION: Session = { userId: USER_ID, aal: 'aal1', hasVerifiedFactor: true }
const AAL2_SESSION: Session = { userId: USER_ID, aal: 'aal2', hasVerifiedFactor: true }
const UNAUTHORIZED = '401 {"error":"unauthorized"}'
const MFA_REQUIRED = '403 {"error":"mfa_required"}'

const NO_SESSION: [name: string, state: AuthState][] = [
  ['no session', SIGNED_OUT],
  ['a token Supabase Auth rejects', REJECTED_TOKEN],
  ['a token without a user id', WITHOUT_SUB],
  ['a revoked aal1 session', REVOKED_SESSION],
  ['an aal1 session during an Auth outage', AUTH_OUTAGE],
]
const PENDING_STEP = [
  {
    who: 'aal1 with a verified factor',
    state: AAL1_WITH_FACTOR,
    requireMfa: OPTIONAL,
    step: 'verify',
  },
  {
    who: 'aal1 with a verified factor',
    state: AAL1_WITH_FACTOR,
    requireMfa: REQUIRED,
    step: 'verify',
  },
  { who: 'aal1 without a factor', state: AAL1_WITHOUT_FACTOR, requireMfa: REQUIRED, step: 'setup' },
  {
    who: 'aal1 with an unconfirmed factor',
    state: AAL1_UNCONFIRMED_FACTOR,
    requireMfa: REQUIRED,
    step: 'setup',
  },
]
const VERIFIED = [
  {
    who: 'aal1 without a factor',
    state: AAL1_WITHOUT_FACTOR,
    requireMfa: OPTIONAL,
    session: AAL1_SESSION,
  },
  {
    who: 'aal1 with an unconfirmed factor',
    state: AAL1_UNCONFIRMED_FACTOR,
    requireMfa: OPTIONAL,
    session: AAL1_SESSION,
  },
  { who: 'aal2', state: AAL2, requireMfa: OPTIONAL, session: AAL2_SESSION },
  { who: 'aal2', state: AAL2, requireMfa: REQUIRED, session: AAL2_SESSION },
]

async function refusalOf(result: unknown): Promise<string> {
  if (!(result instanceof Response)) return 'session'
  return `${String(result.status)} ${await result.text()}`
}

describe('session', () => {
  beforeEach(() => {
    vi.stubEnv('AUTH_REQUIRE_MFA', OPTIONAL)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    setAuthState(undefined)
  })

  describe('verifySession', () => {
    it.each(NO_SESSION)('sends %s to the login page', async (_name, state) => {
      setAuthState(state)

      await expect(verifySession()).rejects.toThrow('redirect /login')
    })

    it('returns an aal1 session with a verified factor without checking the step', async () => {
      vi.stubEnv('AUTH_REQUIRE_MFA', REQUIRED)
      setAuthState(AAL1_WITH_FACTOR)

      await expect(verifySession()).resolves.toEqual(AAL1_FACTOR_SESSION)
    })

    it.each(VERIFIED)(
      'returns the session of $who (AUTH_REQUIRE_MFA=$requireMfa)',
      async ({ state, requireMfa, session }) => {
        vi.stubEnv('AUTH_REQUIRE_MFA', requireMfa)
        setAuthState(state)

        await expect(verifySession()).resolves.toEqual(session)
      },
    )
  })

  describe('sessionMfaStep', () => {
    it.each([
      [AAL1_FACTOR_SESSION, OPTIONAL, 'verify'],
      [AAL1_FACTOR_SESSION, REQUIRED, 'verify'],
      [AAL1_SESSION, REQUIRED, 'setup'],
      [AAL1_SESSION, OPTIONAL, null],
      [AAL2_SESSION, REQUIRED, null],
    ] as const)('%o with AUTH_REQUIRE_MFA=%s → %s', (session, requireMfa, step) => {
      vi.stubEnv('AUTH_REQUIRE_MFA', requireMfa)

      expect(sessionMfaStep(session)).toBe(step)
    })
  })

  describe('requireVerifiedSession', () => {
    it.each(NO_SESSION)('sends %s to the login page', async (_name, state) => {
      setAuthState(state)

      await expect(requireVerifiedSession()).rejects.toThrow('redirect /login')
    })

    it.each(PENDING_STEP)(
      'sends $who (AUTH_REQUIRE_MFA=$requireMfa) to the $step step',
      async ({ state, requireMfa, step }) => {
        vi.stubEnv('AUTH_REQUIRE_MFA', requireMfa)
        setAuthState(state)

        await expect(requireVerifiedSession()).rejects.toThrow(`redirect /mfa/${step}`)
      },
    )

    it.each(VERIFIED)(
      'returns the session of $who (AUTH_REQUIRE_MFA=$requireMfa)',
      async ({ state, requireMfa, session }) => {
        vi.stubEnv('AUTH_REQUIRE_MFA', requireMfa)
        setAuthState(state)

        await expect(requireVerifiedSession()).resolves.toEqual(session)
      },
    )
  })

  describe('verifiedSessionOrResponse', () => {
    it.each(NO_SESSION)('answers 401 to %s instead of redirecting', async (_name, state) => {
      setAuthState(state)

      await expect(refusalOf(await verifiedSessionOrResponse())).resolves.toBe(UNAUTHORIZED)
    })

    it.each(PENDING_STEP)(
      'answers 403 to $who (AUTH_REQUIRE_MFA=$requireMfa) until the $step step is done',
      async ({ state, requireMfa }) => {
        vi.stubEnv('AUTH_REQUIRE_MFA', requireMfa)
        setAuthState(state)

        await expect(refusalOf(await verifiedSessionOrResponse())).resolves.toBe(MFA_REQUIRED)
      },
    )

    it.each(VERIFIED)(
      'returns the session of $who (AUTH_REQUIRE_MFA=$requireMfa)',
      async ({ state, requireMfa, session }) => {
        vi.stubEnv('AUTH_REQUIRE_MFA', requireMfa)
        setAuthState(state)

        await expect(verifiedSessionOrResponse()).resolves.toEqual(session)
      },
    )
  })
})
