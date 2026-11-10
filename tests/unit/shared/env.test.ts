import { afterEach, describe, expect, it, vi } from 'vitest'

import { env } from '@/shared/infrastructure/env'

vi.mock('server-only', () => ({}))

describe('env.authRequireMfa', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('requires the second factor in production unless switched off explicitly', () => {
    vi.stubEnv('NODE_ENV', 'production')
    for (const value of [undefined, '', 'True', '1', 'yes', 'true']) {
      vi.stubEnv('AUTH_REQUIRE_MFA', value)
      expect(env.authRequireMfa(), `AUTH_REQUIRE_MFA=${String(value)}`).toBe(true)
    }
    vi.stubEnv('AUTH_REQUIRE_MFA', 'false')
    expect(env.authRequireMfa()).toBe(false)
  })

  it('keeps the second factor optional outside production until switched on', () => {
    vi.stubEnv('NODE_ENV', 'development')
    for (const value of [undefined, '', 'false', 'True', '1']) {
      vi.stubEnv('AUTH_REQUIRE_MFA', value)
      expect(env.authRequireMfa(), `AUTH_REQUIRE_MFA=${String(value)}`).toBe(false)
    }
    vi.stubEnv('AUTH_REQUIRE_MFA', 'true')
    expect(env.authRequireMfa()).toBe(true)
  })
})
