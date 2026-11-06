import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type Session = { userId: string }

/**
 * Проверенная сессия для серверных компонентов и Server Actions. Вызывать в каждом action —
 * проверка на странице не защищает action от прямого POST. Кэшируется на один запрос.
 */
export const verifySession = cache(async (): Promise<Session> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims.sub
  if (error || !userId) redirect('/login')
  return { userId }
})
