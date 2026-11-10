'use server'

import { createClient } from '@supabase/supabase-js' // expect: local/raw-client
import { createSafeActionClient } from 'next-safe-action' // expect: local/action-client

// expect: local/server-action
export async function loadEverything() {
  // eslint-disable-next-line no-restricted-properties -- expect: @eslint-community/eslint-comments/no-restricted-disable
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? ''
  const client = createClient('https://project.supabase.co', secretKey)
  return { client, actions: createSafeActionClient() }
}
