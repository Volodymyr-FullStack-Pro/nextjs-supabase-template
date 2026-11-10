import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'

import { type Assurance, MFA_PATHS, type MfaStep, pendingMfaStep } from '@/shared/domain/mfa'
import { env } from '@/shared/infrastructure/env'
import { readAssurance } from '@/shared/infrastructure/supabase/assurance'
import { createClient } from '@/shared/infrastructure/supabase/server'

export type Session = { userId: string } & Assurance

export const verifySession = cache(async (): Promise<Session> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub) redirect('/login')
  const assurance = await readAssurance(supabase, claims.aal)
  if (!assurance) redirect('/login')
  return { userId: claims.sub, ...assurance }
})

export function sessionMfaStep(session: Session): MfaStep | null {
  return pendingMfaStep(session, env.authRequireMfa())
}

export async function requireVerifiedSession(): Promise<Session> {
  const session = await verifySession()
  const step = sessionMfaStep(session)
  if (step) redirect(MFA_PATHS[step])
  return session
}
