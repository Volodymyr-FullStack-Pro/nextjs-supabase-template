import { afterEach, describe, expect, it, vi } from 'vitest'

import { RuleViolationError } from '@/shared/domain/errors'
import type { MfaStep } from '@/shared/domain/mfa'
import { actionClient, authActionClient, fail, setupActionClient } from '@/shared/lib/safe-action'

const captureException = vi.hoisted(() => vi.fn())
const SLOW_MS = 1500
const FAST_MS = 1000
type Session = { userId: string; aal: 'aal1' | 'aal2'; hasVerifiedFactor: boolean }

const session = vi.hoisted(() => ({
  verifySession: vi.fn((): Promise<Session> =>
    Promise.resolve({ userId: 'user-1', aal: 'aal1', hasVerifiedFactor: false }),
  ),
  sessionMfaStep: vi.fn((): MfaStep | null => null),
}))

vi.mock('server-only', () => ({}))
vi.mock('@sentry/nextjs', () => ({ captureException }))
vi.mock('@/shared/lib/session', () => session)

describe('actionClient', () => {
  afterEach(() => {
    vi.useRealTimers()
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

  it('logs an action slower than a second as one JSON line with nothing but its duration', async () => {
    vi.useFakeTimers({ toFake: ['performance'] })
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const action = authActionClient.action(() => {
      vi.advanceTimersByTime(SLOW_MS)
      return Promise.resolve('done')
    })

    const result = await action()

    expect(result.data).toBe('done')
    expect(consoleWarn).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(consoleWarn.mock.calls[0]?.[0]))).toEqual({
      type: 'slow-action',
      durationMs: SLOW_MS,
    })
  })

  it('logs a slow action that ends with an error too', async () => {
    vi.useFakeTimers({ toFake: ['performance'] })
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const action = actionClient.action(() => {
      vi.advanceTimersByTime(SLOW_MS)
      return Promise.resolve().then(() => fail(new RuleViolationError('note.title.meaningless')))
    })

    const result = await action()

    expect(result.serverError).toEqual({ code: 'RULE_VIOLATION', rule: 'note.title.meaningless' })
    expect(consoleWarn).toHaveBeenCalledTimes(1)
  })

  it('does not log an action that takes a second or less', async () => {
    vi.useFakeTimers({ toFake: ['performance'] })
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const action = actionClient.action(() => {
      vi.advanceTimersByTime(FAST_MS)
      return Promise.resolve('done')
    })

    await action()

    expect(consoleWarn).not.toHaveBeenCalled()
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

  it('refuses to start a new second-factor setup while the existing one is unconfirmed', async () => {
    session.verifySession.mockResolvedValueOnce({
      userId: 'user-1',
      aal: 'aal1',
      hasVerifiedFactor: true,
    })
    const run = vi.fn(() => Promise.resolve('secret'))

    const result = await setupActionClient.action(run)()

    expect(result.serverError).toEqual({ code: 'FORBIDDEN' })
    expect(run).not.toHaveBeenCalled()
  })

  it('refuses a second factor on top of a confirmed one even in an aal2 session', async () => {
    session.verifySession.mockResolvedValueOnce({
      userId: 'user-1',
      aal: 'aal2',
      hasVerifiedFactor: true,
    })
    const run = vi.fn(() => Promise.resolve('secret'))

    const result = await setupActionClient.action(run)()

    expect(result.serverError).toEqual({ code: 'FORBIDDEN' })
    expect(run).not.toHaveBeenCalled()
  })

  it('lets a user without a second factor start the setup', async () => {
    session.sessionMfaStep.mockReturnValueOnce('setup')

    const result = await setupActionClient.action(() => Promise.resolve('secret'))()

    expect(result.data).toBe('secret')
  })
})
