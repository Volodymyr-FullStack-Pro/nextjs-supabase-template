import 'server-only'

import { createClient } from '@/shared/infrastructure/supabase/server'

import type { AuthGateway } from '../application/auth-gateway'

const HTTP_TOO_MANY_REQUESTS = 429

export const supabaseAuthGateway: AuthGateway = {
  async signInWithPassword(credentials) {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword(credentials)
    if (!error) return 'signed-in'
    if (error.code === 'invalid_credentials') return 'invalid-credentials'
    if (error.code === 'over_request_rate_limit' || error.status === HTTP_TOO_MANY_REQUESTS) {
      return 'too-many-attempts'
    }
    throw new Error(`auth.signIn: ${error.message}`, { cause: error })
  },
}
