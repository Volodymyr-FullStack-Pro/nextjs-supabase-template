import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/shared/infrastructure/env'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl(), env.supabasePublishableKey())
}
