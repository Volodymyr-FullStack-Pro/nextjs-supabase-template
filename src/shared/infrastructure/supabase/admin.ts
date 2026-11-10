import 'server-only'

import { createClient } from '@supabase/supabase-js'

import { env } from '@/shared/infrastructure/env'

import type { Database } from './types'

export function createAdminClient() {
  return createClient<Database>(env.supabaseUrl(), env.supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
