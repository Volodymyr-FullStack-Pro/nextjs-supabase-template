import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/lib/env'
import type { Database } from './types'

/** Клиент для клиентских компонентов (браузер). Публичный ключ, RLS применяется. */
export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl(), env.supabasePublishableKey())
}
