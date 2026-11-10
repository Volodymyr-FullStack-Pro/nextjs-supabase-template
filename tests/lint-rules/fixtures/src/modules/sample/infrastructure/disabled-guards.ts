import 'server-only'

// eslint-disable-next-line local/raw-client -- expect: @eslint-community/eslint-comments/no-restricted-disable
import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line no-restricted-imports, boundaries/dependencies -- expect: @eslint-community/eslint-comments/no-restricted-disable
import { env } from '@/shared/infrastructure/env'

export function publicClient() {
  return createClient(env.supabaseUrl(), env.supabasePublishableKey())
}
