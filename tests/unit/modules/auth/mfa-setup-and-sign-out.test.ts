import { describe, expect, it, vi } from 'vitest'

import { makeSignOut } from '@/modules/auth/application/sign-out'
import { makeStartTotpSetup } from '@/modules/auth/application/start-totp-setup'

describe('startTotpSetup', () => {
  it('returns a fresh enrollment with the QR code and the secret', async () => {
    const enrollment = {
      factorId: 'factor-1',
      qrCode: 'data:image/svg+xml;utf-8,<svg/>',
      secret: 'ABC',
    }
    const startTotpSetup = makeStartTotpSetup({
      mfa: { enrollTotp: () => Promise.resolve(enrollment) },
    })
    expect(await startTotpSetup()).toEqual(enrollment)
  })
})

describe('signOut', () => {
  it('ends the session through the gateway', async () => {
    const signOut = vi.fn(() => Promise.resolve())
    await makeSignOut({ auth: { signOut } })()
    expect(signOut).toHaveBeenCalledOnce()
  })
})
