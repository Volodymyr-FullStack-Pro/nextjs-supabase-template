import { randomUUID } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { isCronRequest } from '@/shared/lib/cron'

vi.mock('server-only', () => ({}))

const SECRET = `${randomUUID()}${randomUUID()}`

function cronRequest(authorization?: string): Request {
  const headers = new Headers()
  if (authorization !== undefined) headers.set('authorization', authorization)
  return new Request('https://app.test/api/cron/recalculate', { headers })
}

describe('isCronRequest', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('accepts the scheduler request that carries the configured secret', () => {
    vi.stubEnv('CRON_SECRET', SECRET)
    expect(isCronRequest(cronRequest(`Bearer ${SECRET}`))).toBe(true)
  })

  it('rejects a request without the header, with another scheme or another secret', () => {
    vi.stubEnv('CRON_SECRET', SECRET)
    const rejected = [
      undefined,
      '',
      SECRET,
      `Basic ${SECRET}`,
      'Bearer another-secret',
      `Bearer ${SECRET}x`,
      `Bearer ${SECRET.slice(1)}`,
      `Bearer ${SECRET.slice(0, -1)}`,
      `Bearer ${SECRET.charAt(0)}`,
      'Bearer ',
      'Bearer',
    ]
    for (const authorization of rejected) {
      expect(
        isCronRequest(cronRequest(authorization)),
        `authorization: ${String(authorization)}`,
      ).toBe(false)
    }
  })

  it('fails closed while the secret is not configured', () => {
    for (const secret of [undefined, '']) {
      vi.stubEnv('CRON_SECRET', secret)
      for (const authorization of [undefined, 'Bearer', 'Bearer ', 'Bearer undefined']) {
        expect(
          isCronRequest(cronRequest(authorization)),
          `authorization: ${String(authorization)}`,
        ).toBe(false)
      }
    }
  })
})
