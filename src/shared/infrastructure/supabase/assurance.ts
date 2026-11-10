import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { type Assurance, toAssuranceLevel } from '@/shared/domain/mfa'
import { reportUnexpectedError } from '@/shared/infrastructure/monitoring'

const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const SESSION_REJECTED = new Set([HTTP_UNAUTHORIZED, HTTP_FORBIDDEN])

export async function readAssurance(
  supabase: SupabaseClient,
  aalClaim: string | undefined,
): Promise<Assurance | null> {
  const aal = toAssuranceLevel(aalClaim)
  if (aal === 'aal2') return { aal, hasVerifiedFactor: true }
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) {
    if (error.status === undefined || !SESSION_REJECTED.has(error.status)) {
      reportUnexpectedError('auth.listFactors', error)
    }
    return null
  }
  return { aal, hasVerifiedFactor: data.all.some((factor) => factor.status === 'verified') }
}
