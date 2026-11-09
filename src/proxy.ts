import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { env } from '@/shared/infrastructure/env'
import { sessionCookieOptions } from '@/shared/infrastructure/supabase/cookie-options'
import type { Database } from '@/shared/infrastructure/supabase/types'

const PUBLIC_PATHS = ['/', '/login', '/api/vitals']
const PUBLIC_PREFIXES = ['/api/cron/', '/api/webhooks/']
const HTTP_UNAUTHORIZED = 401
const HTTP_SERVICE_UNAVAILABLE = 503

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = isPublicPath(pathname)
  if (!env.hasSupabase()) {
    return isPublic
      ? NextResponse.next({ request })
      : new NextResponse('Сервис не настроен', { status: HTTP_SERVICE_UNAVAILABLE })
  }

  let response = NextResponse.next({ request })
  const cacheHeaders = new Headers()
  const supabase = createServerClient<Database>(env.supabaseUrl(), env.supabasePublishableKey(), {
    cookieOptions: sessionCookieOptions(request.nextUrl.host),
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet)
          response.cookies.set(name, value, options)
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value)
          cacheHeaders.set(key, value)
        }
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  if (data?.claims || isPublic) return response
  if (pathname.startsWith('/api/'))
    return NextResponse.json({ error: 'unauthorized' }, { status: HTTP_UNAUTHORIZED })
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  const redirect = NextResponse.redirect(url)
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie)
  for (const [key, value] of cacheHeaders) redirect.headers.set(key, value)
  return redirect
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
