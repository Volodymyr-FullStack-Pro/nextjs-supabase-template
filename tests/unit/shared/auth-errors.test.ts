import { describe, expect, it, vi } from 'vitest'

import { authError } from '@/shared/infrastructure/supabase/auth-errors'

vi.mock('server-only', () => ({}))

const EMAIL = 'investor@example.com'

describe('authError', () => {
  it.each([
    [{ code: 'unexpected_failure', status: 500 }, 'auth.signIn: unexpected_failure (500)'],
    [{ code: 'email_address_invalid', status: undefined }, 'auth.signIn: email_address_invalid'],
    [{ code: undefined, status: 503 }, 'auth.signIn: (503)'],
    [{}, 'auth.signIn: unknown'],
  ])('names the operation, the code and the status of %o', (failure, message) => {
    expect(authError('auth.signIn', failure).message).toBe(message)
  })

  it('carries neither the text of the Auth error, which may name the e-mail, nor the error itself', () => {
    const provider = Object.assign(new Error(`Email address "${EMAIL}" is invalid`), {
      code: 'email_address_invalid',
      status: 400,
    })

    const failure = authError('auth.signIn', provider)

    expect(failure.message).toBe('auth.signIn: email_address_invalid (400)')
    expect(failure.cause).toBeUndefined()
    expect(`${String(failure)} ${failure.stack ?? ''}`).not.toContain(EMAIL)
  })
})
