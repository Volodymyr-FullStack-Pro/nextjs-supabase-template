import 'server-only'

// eslint-disable-next-line local/raw-client -- expect: @eslint-community/eslint-comments/no-restricted-disable
import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line no-restricted-imports -- expect: @eslint-community/eslint-comments/no-restricted-disable
import { createAdminClient } from '@/shared/infrastructure/supabase/admin'
// eslint-disable-next-line boundaries/dependencies -- expect: @eslint-community/eslint-comments/no-restricted-disable
import { env } from '@/shared/infrastructure/env'

export function publicClient() {
  return createClient(env.supabaseUrl(), env.supabasePublishableKey())
}

export function secretClient() {
  // eslint-disable-next-line no-restricted-properties -- expect: @eslint-community/eslint-comments/no-restricted-disable
  return [createAdminClient(), env.supabaseSecretKey()]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- expect: @eslint-community/eslint-comments/no-restricted-disable
export function loose(row: any): string {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- expect: @eslint-community/eslint-comments/no-restricted-disable
  return String(row) as string
}
