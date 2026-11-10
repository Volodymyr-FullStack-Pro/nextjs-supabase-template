import 'server-only'

import { reportAuthFailure } from '@/shared/infrastructure/monitoring'
import { createClient } from '@/shared/infrastructure/supabase/server'

import type { AuthGateway } from '../application/auth-gateway'

const HTTP_TOO_MANY_REQUESTS = 429

export const supabaseAuthGateway: AuthGateway = {
  async signInWithPassword(credentials) {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword(credentials)
    if (!error) return 'signed-in'
    if (error.code === 'invalid_credentials') {
      reportAuthFailure('invalid-credentials')
      return 'invalid-credentials'
    }
    if (error.code === 'over_request_rate_limit' || error.status === HTTP_TOO_MANY_REQUESTS) {
      reportAuthFailure('too-many-attempts')
      return 'too-many-attempts'
    }
    throw new Error(`auth.signIn: ${error.message}`, { cause: error })
  },

  async signOut() {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(`auth.signOut: ${error.message}`, { cause: error })
  },
}
