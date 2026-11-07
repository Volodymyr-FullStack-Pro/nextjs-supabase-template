import 'server-only'

import { createClient } from '@/shared/infrastructure/supabase/server'

import type { AuthGateway } from '../application/auth-gateway'

const HTTP_BAD_REQUEST = 400

export const supabaseAuthGateway: AuthGateway = {
  async signInWithPassword(credentials) {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword(credentials)
    if (!error) return true
    if (error.status === HTTP_BAD_REQUEST) return false
    throw new Error(`auth.signIn: ${error.message}`, { cause: error })
  },
}
