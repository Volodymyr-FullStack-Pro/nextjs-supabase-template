import { afterEach, describe, expect, it, vi } from 'vitest'

import { RuleViolationError } from '@/shared/domain/errors'
import { actionClient, fail } from '@/shared/lib/safe-action'

const captureException = vi.hoisted(() => vi.fn())

vi.mock('server-only', () => ({}))
vi.mock('@sentry/nextjs', () => ({ captureException }))
vi.mock('@/shared/lib/session', () => ({ verifySession: vi.fn() }))

const GENERIC_MESSAGE = 'Что-то пошло не так. Попробуйте ещё раз.'

describe('actionClient', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    captureException.mockClear()
  })

  it('returns the domain message of an expected error without logging it', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const action = actionClient.action(() =>
      Promise.resolve().then(() =>
        fail(new RuleViolationError('note.title.meaningless', 'Заголовок без букв')),
      ),
    )

    const result = await action()

    expect(result.serverError).toBe('Заголовок без букв')
    expect(consoleError).not.toHaveBeenCalled()
    expect(captureException).not.toHaveBeenCalled()
  })

  it('logs an unexpected error as one JSON line and reports it to Sentry', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failure = new Error('notes.insert: connection reset')
    const action = actionClient.action(() => Promise.reject(failure))

    const result = await action()

    expect(result.serverError).toBe(GENERIC_MESSAGE)
    expect(consoleError).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(consoleError.mock.calls[0]?.[0]))).toEqual({
      type: 'action-error',
      error: 'Error',
      message: 'notes.insert: connection reset',
    })
    expect(captureException).toHaveBeenCalledWith(failure)
  })
})
