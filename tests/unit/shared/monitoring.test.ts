import { afterEach, describe, expect, it, vi } from 'vitest'

import { reportAuthFailure } from '@/shared/infrastructure/monitoring'

const captureMessage = vi.hoisted(() => vi.fn())

vi.mock('server-only', () => ({}))
vi.mock('@sentry/nextjs', () => ({ captureMessage, captureException: vi.fn() }))

describe('reportAuthFailure', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    captureMessage.mockClear()
  })

  it('logs a wrong password as one JSON line without reporting it to Sentry', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    reportAuthFailure('invalid-credentials')

    expect(JSON.parse(String(consoleWarn.mock.calls[0]?.[0]))).toEqual({
      type: 'auth-failure',
      code: 'invalid-credentials',
    })
    expect(captureMessage).not.toHaveBeenCalled()
  })

  it('reports a tripped rate limit to Sentry as the sign of a brute-force attempt', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    reportAuthFailure('too-many-attempts')

    expect(captureMessage).toHaveBeenCalledWith('auth-failure', {
      level: 'warning',
      tags: { code: 'too-many-attempts' },
      fingerprint: ['auth-failure', 'too-many-attempts'],
    })
  })
})
