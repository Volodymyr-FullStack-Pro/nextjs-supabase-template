import 'server-only'

import { cookies, headers } from 'next/headers'
import { connection } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { env } from '@/shared/infrastructure/env'

import { sessionCookieOptions } from './cookie-options'
import type { Database } from './types'

export async function createClient() {
  await connection()
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
  return createServerClient<Database>(env.supabaseUrl(), env.supabasePublishableKey(), {
    cookieOptions: sessionCookieOptions(headerStore.get('host') ?? ''),
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
          // eslint-disable-next-line no-empty -- Next does not allow setting cookies from a Server Component; proxy.ts refreshes the session
        } catch {}
      },
    },
  })
}
