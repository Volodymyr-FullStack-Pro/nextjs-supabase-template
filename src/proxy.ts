import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { env } from '@/shared/infrastructure/env'
import type { Database } from '@/shared/infrastructure/supabase/types'

const PUBLIC_PATHS = ['/', '/login', '/api/vitals']
const PUBLIC_PREFIXES = ['/api/cron/', '/api/webhooks/']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  if (!env.hasSupabase()) return response

  const supabase = createServerClient<Database>(env.supabaseUrl(), env.supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet)
          response.cookies.set(name, value, options)
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const { pathname } = request.nextUrl
  const isPublic =
    PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  if (!data?.claims && !isPublic) {
    if (pathname.startsWith('/api/'))
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirect = NextResponse.redirect(url)
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
    return redirect
  }
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
