import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'

import { type Assurance, MFA_PATHS, type MfaStep, pendingMfaStep } from '@/shared/domain/mfa'
import { env } from '@/shared/infrastructure/env'
import { readAssurance } from '@/shared/infrastructure/supabase/assurance'
import { createClient } from '@/shared/infrastructure/supabase/server'

import { API_DENIALS, type ApiDenial } from './api-denial'

export type Session = { userId: string } & Assurance

const readSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (error || !claims?.sub) return null
  const assurance = await readAssurance(supabase, claims.aal)
  return assurance ? { userId: claims.sub, ...assurance } : null
})

export async function verifySession(): Promise<Session> {
  return (await readSession()) ?? redirect('/login')
}

export function sessionMfaStep(session: Session): MfaStep | null {
  return pendingMfaStep(session, env.authRequireMfa())
}

export async function requireVerifiedSession(): Promise<Session> {
  const session = await verifySession()
  const step = sessionMfaStep(session)
  if (step) redirect(MFA_PATHS[step])
  return session
}

const refuse = ({ body, status }: ApiDenial) => Response.json(body, { status })

export async function verifiedSessionOrResponse(): Promise<Session | Response> {
  const session = await readSession()
  if (!session) return refuse(API_DENIALS.unauthorized)
  return sessionMfaStep(session) ? refuse(API_DENIALS.mfaRequired) : session
}
