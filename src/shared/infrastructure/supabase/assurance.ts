import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { type Assurance, toAssuranceLevel } from '@/shared/domain/mfa'

export async function readAssurance(
  supabase: SupabaseClient,
  aalClaim: string | undefined,
): Promise<Assurance> {
  const aal = toAssuranceLevel(aalClaim)
  if (aal === 'aal2') return { aal, hasVerifiedFactor: true }
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw new Error(`auth.listFactors: ${error.message}`, { cause: error })
  return { aal, hasVerifiedFactor: data.all.some((factor) => factor.status === 'verified') }
}
