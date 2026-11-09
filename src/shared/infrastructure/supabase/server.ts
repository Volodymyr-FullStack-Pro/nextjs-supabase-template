import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { env } from '@/shared/infrastructure/env'

import { sessionCookieOptions } from './cookie-options'
import type { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(env.supabaseUrl(), env.supabasePublishableKey(), {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
          // eslint-disable-next-line no-empty -- Next не даёт писать cookies из серверного компонента; proxy.ts обновит сессию
        } catch {}
      },
    },
  })
}
