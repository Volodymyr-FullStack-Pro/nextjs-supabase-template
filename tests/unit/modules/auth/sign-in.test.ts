import { describe, expect, it } from 'vitest'

import type { SignInOutcome } from '@/modules/auth/application/auth-gateway'
import { makeSignIn } from '@/modules/auth/application/sign-in'

const credentials = { email: 'a@b.c', password: 'secret' }
const signInWith = (outcome: SignInOutcome) =>
  makeSignIn({ auth: { signInWithPassword: () => Promise.resolve(outcome) } })

describe('signIn', () => {
  it('succeeds when the gateway accepts the credentials', async () => {
    expect(await signInWith('signed-in')(credentials)).toEqual({ ok: true, value: undefined })
  })

  it('returns an invalid-credentials error when the gateway rejects them', async () => {
    expect(await signInWith('invalid-credentials')(credentials)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_CREDENTIALS' },
    })
  })

  it('tells the user to wait when attempts are rate limited', async () => {
    expect(await signInWith('too-many-attempts')(credentials)).toMatchObject({
      ok: false,
      error: { code: 'TOO_MANY_ATTEMPTS', message: 'Слишком много попыток, подождите минуту' },
    })
  })
})
