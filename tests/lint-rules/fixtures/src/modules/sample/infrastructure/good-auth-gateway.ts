import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { authError } from '@/shared/infrastructure/supabase/auth-errors'

export async function signOut(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw authError('auth.signOut', error)
}
