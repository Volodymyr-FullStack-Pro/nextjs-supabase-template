import { describe, expect, it } from 'vitest'

import { TotpCodeInput } from '@/modules/auth/domain/totp'

describe('TotpCodeInput', () => {
  it('accepts six digits typed with a space in the middle', () => {
    expect(TotpCodeInput.parse({ code: '123 456' })).toEqual({ code: '123456' })
  })

  it('rejects a code that is not six digits', () => {
    expect(TotpCodeInput.safeParse({ code: '12345' }).success).toBe(false)
    expect(TotpCodeInput.safeParse({ code: '12345a' }).success).toBe(false)
  })

  it('accepts the id of the factor being set up', () => {
    const factorId = '0b4f3c1e-8f5a-4a43-9a51-2f3c1d7e9b10'
    expect(TotpCodeInput.parse({ code: '123456', factorId })).toEqual({ code: '123456', factorId })
  })
})
