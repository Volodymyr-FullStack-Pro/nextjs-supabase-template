import { describe, expect, it, vi } from 'vitest'

import type { MfaGateway, TotpOutcome } from '@/modules/auth/application/mfa-gateway'
import { makeVerifyTotpCode } from '@/modules/auth/application/verify-totp-code'

const ENROLLED_FACTOR = 'factor-enrolled'

function gateway(outcome: TotpOutcome, verifiedFactor: string | null = ENROLLED_FACTOR) {
  return {
    enrollTotp: vi.fn(),
    verifiedTotpFactorId: vi.fn(() => Promise.resolve(verifiedFactor)),
    verifyTotp: vi.fn(() => Promise.resolve(outcome)),
  } satisfies MfaGateway
}

describe('verifyTotpCode', () => {
  it('verifies the code against the enrolled factor at sign-in', async () => {
    const mfa = gateway('verified')
    expect(await makeVerifyTotpCode({ mfa })({ code: '123456' })).toEqual({
      ok: true,
      value: undefined,
    })
    expect(mfa.verifyTotp).toHaveBeenCalledWith({ factorId: ENROLLED_FACTOR, code: '123456' })
  })

  it('confirms the factor being set up when its id is given', async () => {
    const mfa = gateway('verified', null)
    await makeVerifyTotpCode({ mfa })({ code: '123456', factorId: 'factor-new' })
    expect(mfa.verifiedTotpFactorId).not.toHaveBeenCalled()
    expect(mfa.verifyTotp).toHaveBeenCalledWith({ factorId: 'factor-new', code: '123456' })
  })

  it('reports a missing second factor', async () => {
    expect(
      await makeVerifyTotpCode({ mfa: gateway('verified', null) })({ code: '123456' }),
    ).toMatchObject({ ok: false, error: { code: 'SECOND_FACTOR_MISSING' } })
  })

  it('rejects a wrong code', async () => {
    expect(
      await makeVerifyTotpCode({ mfa: gateway('invalid-code') })({ code: '123456' }),
    ).toMatchObject({ ok: false, error: { code: 'INVALID_TOTP_CODE' } })
  })

  it('tells the user to wait when attempts are rate limited', async () => {
    expect(
      await makeVerifyTotpCode({ mfa: gateway('too-many-attempts') })({ code: '123456' }),
    ).toMatchObject({ ok: false, error: { code: 'TOO_MANY_ATTEMPTS' } })
  })
})
