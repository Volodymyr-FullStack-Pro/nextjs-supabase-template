import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { readAssurance } from '@/shared/infrastructure/supabase/assurance'

const reportUnexpectedError = vi.hoisted(() => vi.fn())

vi.mock('server-only', () => ({}))
vi.mock('@/shared/infrastructure/monitoring', () => ({ reportUnexpectedError }))

type ListFactorsResult = {
  data: { all: { status: string }[] } | null
  error: { message: string; status: number | undefined } | null
}

function clientWith(result: ListFactorsResult): SupabaseClient {
  const listFactors = vi.fn(() => Promise.resolve(result))
  return { auth: { mfa: { listFactors } } } as unknown as SupabaseClient
}

describe('readAssurance', () => {
  afterEach(() => {
    reportUnexpectedError.mockClear()
  })

  it('trusts an aal2 claim without asking Supabase Auth', async () => {
    const supabase = clientWith({ data: null, error: { message: 'unused', status: 500 } })

    await expect(readAssurance(supabase, 'aal2')).resolves.toEqual({
      aal: 'aal2',
      hasVerifiedFactor: true,
    })
  })

  it('reads whether an aal1 session has a verified factor', async () => {
    const supabase = clientWith({
      data: { all: [{ status: 'unverified' }, { status: 'verified' }] },
      error: null,
    })

    await expect(readAssurance(supabase, 'aal1')).resolves.toEqual({
      aal: 'aal1',
      hasVerifiedFactor: true,
    })
  })

  it('treats a rejected session as no session without raising an alarm', async () => {
    const supabase = clientWith({ data: null, error: { message: 'banned', status: 403 } })

    await expect(readAssurance(supabase, undefined)).resolves.toBeNull()
    expect(reportUnexpectedError).not.toHaveBeenCalled()
  })

  it('reports an outage of Supabase Auth and still signs the visitor out', async () => {
    const error = { message: 'upstream timeout', status: 503 }
    const supabase = clientWith({ data: null, error })

    await expect(readAssurance(supabase, 'aal1')).resolves.toBeNull()
    expect(reportUnexpectedError).toHaveBeenCalledWith('auth.listFactors', error)
  })
})
