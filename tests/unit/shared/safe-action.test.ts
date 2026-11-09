import { afterEach, describe, expect, it, vi } from 'vitest'

import { RuleViolationError } from '@/shared/domain/errors'
import type { MfaStep } from '@/shared/domain/mfa'
import { actionClient, authActionClient, fail } from '@/shared/lib/safe-action'

const captureException = vi.hoisted(() => vi.fn())
const session = vi.hoisted(() => ({
  verifySession: vi.fn(() =>
    Promise.resolve({ userId: 'user-1', aal: 'aal1', hasVerifiedFactor: false }),
  ),
  sessionMfaStep: vi.fn((): MfaStep | null => null),
}))

vi.mock('server-only', () => ({}))
vi.mock('@sentry/nextjs', () => ({ captureException }))
vi.mock('@/shared/lib/session', () => session)

describe('actionClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    captureException.mockClear()
  })

  it('returns the code and rule of an expected error without logging it', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const action = actionClient.action(() =>
      Promise.resolve().then(() => fail(new RuleViolationError('note.title.meaningless'))),
    )

    const result = await action()

    expect(result.serverError).toEqual({ code: 'RULE_VIOLATION', rule: 'note.title.meaningless' })
    expect(consoleError).not.toHaveBeenCalled()
    expect(captureException).not.toHaveBeenCalled()
  })

  it('logs an unexpected error as one JSON line and reports it to Sentry', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failure = new Error('notes.insert: connection reset')
    const action = actionClient.action(() => Promise.reject(failure))

    const result = await action()

    expect(result.serverError).toEqual({ code: 'UNEXPECTED' })
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(consoleError.mock.calls[0]?.[0]))).toEqual({
      type: 'action-error',
      error: 'Error',
      message: 'notes.insert: connection reset',
    })
    expect(captureException).toHaveBeenCalledWith(failure)
  })

  it('refuses a signed-in action until the second factor is confirmed', async () => {
    session.sessionMfaStep.mockReturnValueOnce('verify')
    const run = vi.fn(() => Promise.resolve('done'))

    const result = await authActionClient.action(run)()

    expect(result.serverError).toEqual({ code: 'MFA_REQUIRED' })
    expect(run).not.toHaveBeenCalled()
  })

  it('runs a signed-in action when no second-factor step is pending', async () => {
    const result = await authActionClient.action(() => Promise.resolve('done'))()

    expect(result.data).toBe('done')
  })
})
