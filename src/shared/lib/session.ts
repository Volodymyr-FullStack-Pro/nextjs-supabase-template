import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'

import { type Assurance, type MfaStep, pendingMfaStep } from '@/shared/domain/mfa'
import { env } from '@/shared/infrastructure/env'
import { readAssurance } from '@/shared/infrastructure/supabase/assurance'
import { createClient } from '@/shared/infrastructure/supabase/server'

export type Session = { userId: string } & Assurance

export const verifySession = cache(async (): Promise<Session> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub) redirect('/login')
  return { userId: claims.sub, ...(await readAssurance(supabase, claims.aal)) }
})

export function sessionMfaStep(session: Session): MfaStep | null {
  return pendingMfaStep(session, env.authRequireMfa())
}
