import { describe, expect, it } from 'vitest'
import { SignInInput } from '@/modules/auth/domain/sign-in'

describe('SignInInput', () => {
  it('rejects a malformed email', () => {
    expect(SignInInput.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false)
  })

  it('accepts a valid email with a non-empty password', () => {
    expect(SignInInput.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true)
  })
})
