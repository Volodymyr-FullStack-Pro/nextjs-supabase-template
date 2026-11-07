import { describe, expect, it } from 'vitest'
import { makeSignIn } from '@/modules/auth/application/sign-in'

const credentials = { email: 'a@b.c', password: 'secret' }

describe('signIn', () => {
  it('succeeds when the gateway accepts the credentials', async () => {
    const signIn = makeSignIn({ auth: { signInWithPassword: () => Promise.resolve(true) } })
    expect(await signIn(credentials)).toEqual({ ok: true, value: undefined })
  })

  it('returns an invalid-credentials error when the gateway rejects them', async () => {
    const signIn = makeSignIn({ auth: { signInWithPassword: () => Promise.resolve(false) } })
    expect(await signIn(credentials)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_CREDENTIALS' },
    })
  })
})
