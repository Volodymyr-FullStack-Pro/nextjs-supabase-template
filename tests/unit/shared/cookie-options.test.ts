import { afterEach, describe, expect, it, vi } from 'vitest'

import { sessionCookieOptions } from '@/shared/infrastructure/supabase/cookie-options'

describe('sessionCookieOptions', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('hides the session cookie from scripts and sends it over https only in production', () => {
    vi.stubEnv('NODE_ENV', 'production')

    expect(sessionCookieOptions('app.example')).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    })
  })

  it.each(['localhost:3100', '127.0.0.1:3100', 'localhost'])(
    'keeps the cookie usable over http on %s in production (e2e against the production build)',
    (host) => {
      vi.stubEnv('NODE_ENV', 'production')

      expect(sessionCookieOptions(host)).toEqual({ httpOnly: true, secure: false, sameSite: 'lax' })
    },
  )

  it('does not require https in development', () => {
    vi.stubEnv('NODE_ENV', 'development')

    expect(sessionCookieOptions('app.example')).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    })
  })
})
