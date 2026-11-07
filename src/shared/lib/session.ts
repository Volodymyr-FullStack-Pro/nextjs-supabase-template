import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'

import { createClient } from '@/shared/infrastructure/supabase/server'

export type Session = { userId: string }

export const verifySession = cache(async (): Promise<Session> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims.sub
  if (error || !userId) redirect('/login')
  return { userId }
})
