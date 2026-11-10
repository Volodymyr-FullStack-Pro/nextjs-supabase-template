import type { ErrorEvent } from '@sentry/nextjs'
import { describe, expect, it, vi } from 'vitest'

import { withoutRequestDetails } from '@/instrumentation'

vi.mock('server-only', () => ({}))
vi.mock('@sentry/nextjs', () => ({ init: vi.fn(), captureRequestError: vi.fn() }))

describe('withoutRequestDetails', () => {
  it('keeps the request method and path but drops headers, cookies, body and query', () => {
    const event = {
      type: undefined,
      request: {
        method: 'POST',
        url: 'https://app.example/notes?q=secret%20search',
        query_string: 'q=secret%20search',
        headers: { cookie: 'sb-token=…' },
        cookies: { 'sb-token': '…' },
        data: { amount: '1234.56' },
      },
    } as unknown as ErrorEvent

    expect(withoutRequestDetails(event)).toEqual({
      type: undefined,
      request: { method: 'POST', url: 'https://app.example/notes' },
    })
  })

  it('returns an event without request data unchanged', () => {
    const event = { type: undefined, message: 'auth-failure' } as unknown as ErrorEvent

    expect(withoutRequestDetails(event)).toBe(event)
  })
})
