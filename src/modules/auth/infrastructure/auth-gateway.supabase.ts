import 'server-only'
import { createClient } from '@/shared/infrastructure/supabase/server'
import type { AuthGateway } from '../application/auth-gateway'

export const supabaseAuthGateway: AuthGateway = {
  async signInWithPassword(credentials) {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword(credentials)
    return !error
  },
}
