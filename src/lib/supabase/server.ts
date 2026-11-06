import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'
import type { Database } from './types'

/** Клиент для серверных компонентов, Server Actions и Route Handlers. Сессия из cookie; RLS применяется. */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(env.supabaseUrl(), env.supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
        } catch {
          // Вызов из Server Component: cookie там менять нельзя, сессию обновляет proxy.ts.
        }
      },
    },
  })
}
