import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { MFA_PATHS, pendingMfaStep } from '@/shared/domain/mfa'
import { env } from '@/shared/infrastructure/env'
import { readAssurance } from '@/shared/infrastructure/supabase/assurance'
import { sessionCookieOptions } from '@/shared/infrastructure/supabase/cookie-options'
import type { Database } from '@/shared/infrastructure/supabase/types'

const PUBLIC_PATHS = ['/', '/login', '/api/vitals']
const PUBLIC_PREFIXES = ['/api/cron/', '/api/webhooks/']
const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403
const HTTP_SERVICE_UNAVAILABLE = 503

type ProxyState = { response: NextResponse; cacheHeaders: Headers }

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

function createProxyClient(request: NextRequest, state: ProxyState) {
  return createServerClient<Database>(env.supabaseUrl(), env.supabasePublishableKey(), {
    cookieOptions: sessionCookieOptions(request.nextUrl.host),
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        state.response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet)
          state.response.cookies.set(name, value, options)
        for (const [key, value] of Object.entries(headers)) {
          state.response.headers.set(key, value)
          state.cacheHeaders.set(key, value)
        }
      },
    },
  })
}

function deny(request: NextRequest, state: ProxyState, to: { pathname: string; status: number }) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const error = to.status === HTTP_UNAUTHORIZED ? 'unauthorized' : 'mfa_required'
    return NextResponse.json({ error }, { status: to.status })
  }
  const url = request.nextUrl.clone()
  url.pathname = to.pathname
  const redirect = NextResponse.redirect(url)
  for (const cookie of state.response.cookies.getAll()) redirect.cookies.set(cookie)
  for (const [key, value] of state.cacheHeaders) redirect.headers.set(key, value)
  return redirect
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = isPublicPath(pathname)
  if (!env.hasSupabase()) {
    return isPublic
      ? NextResponse.next({ request })
      : new NextResponse('Сервис не настроен', { status: HTTP_SERVICE_UNAVAILABLE })
  }

  const state: ProxyState = {
    response: NextResponse.next({ request }),
    cacheHeaders: new Headers(),
  }
  const supabase = createProxyClient(request, state)
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (isPublic) return state.response
  if (!claims) return deny(request, state, { pathname: '/login', status: HTTP_UNAUTHORIZED })

  const assurance = await readAssurance(supabase, claims.aal)
  const step = pendingMfaStep(assurance, env.authRequireMfa())
  if (!step || pathname === MFA_PATHS[step]) return state.response
  return deny(request, state, { pathname: MFA_PATHS[step], status: HTTP_FORBIDDEN })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
