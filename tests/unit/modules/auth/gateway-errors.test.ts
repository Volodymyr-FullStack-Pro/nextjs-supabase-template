import { beforeEach, describe, expect, it, vi } from 'vitest'

import { supabaseAuthGateway } from '@/modules/auth/infrastructure/auth-gateway.supabase'
import { supabaseMfaGateway } from '@/modules/auth/infrastructure/mfa-gateway.supabase'

type AuthFailure = { message: string; code: string | undefined; status: number | undefined }

const auth = vi.hoisted(() => {
  const state: { failure: AuthFailure | null } = { failure: null }
  const refuse = () => Promise.resolve({ data: null, error: state.failure })
  return {
    state,
    client: {
      auth: {
        signInWithPassword: refuse,
        signOut: refuse,
        mfa: { listFactors: refuse, enroll: refuse, challengeAndVerify: refuse },
      },
    },
  }
})

vi.mock('server-only', () => ({}))
vi.mock('@/shared/infrastructure/monitoring', () => ({ reportAuthFailure: vi.fn() }))
vi.mock('@/shared/infrastructure/supabase/server', () => ({
  createClient: () => Promise.resolve(auth.client),
}))

const EMAIL = 'investor@example.com'
const CREDENTIALS = { email: EMAIL, password: 'correct horse battery staple' }

async function failureOf(operation: Promise<unknown>): Promise<Error> {
  const failure: unknown = await operation.then(
    () => new Error('операция не отклонена'),
    (error: unknown) => error,
  )
  if (!(failure instanceof Error)) throw new TypeError('отклонено не ошибкой')
  return failure
}

describe('Supabase Auth gateways', () => {
  beforeEach(() => {
    auth.state.failure = {
      message: `Database error finding user ${EMAIL}`,
      code: 'unexpected_failure',
      status: 500,
    }
  })

  it.each([
    ['auth.signIn', () => supabaseAuthGateway.signInWithPassword(CREDENTIALS)],
    ['auth.signOut', () => supabaseAuthGateway.signOut()],
    ['mfa.listFactors', () => supabaseMfaGateway.enrollTotp()],
    ['mfa.listFactors', () => supabaseMfaGateway.verifiedTotpFactorId()],
    ['mfa.verify', () => supabaseMfaGateway.verifyTotp({ factorId: 'factor-1', code: '123456' })],
  ])(
    'report an unexpected refusal of Auth as %s with its code and status, without the text',
    async (name, run) => {
      const failure = await failureOf(run())

      expect(failure.message).toBe(`${name}: unexpected_failure (500)`)
      expect(failure.cause).toBeUndefined()
      expect(`${String(failure)} ${failure.stack ?? ''}`).not.toContain(EMAIL)
    },
  )
})
